-- AutoShip core schema: accounts, shipments, capacity, policy, matching, approvals,
-- bookings, tracking, emissions reference data, and audit events.
-- Money is integer pence; weights kg; dimensions cm; times timestamptz.

create type public.account_kind as enum ('shipper', 'provider');
create type public.shipper_type as enum ('business', 'individual');
create type public.transport_mode as enum ('road', 'sea', 'air');
create type public.mode_preference as enum ('road', 'sea', 'air', 'any');
create type public.optimisation_preference as enum ('cheapest', 'fastest', 'lowest_carbon', 'balanced');
create type public.urgency as enum ('standard', 'urgent', 'critical');
create type public.shipment_status as enum
  ('pending_match', 'awaiting_approval', 'booked', 'no_match', 'in_transit', 'delivered', 'cancelled');
create type public.listing_status as enum ('active', 'paused', 'archived');
create type public.recurrence as enum ('one_off', 'recurring');
create type public.approval_reason as enum
  ('price_over_limit', 'value_over_threshold', 'critical_shipment', 'deadline_margin_low', 'dangerous_goods', 'no_exact_match');
create type public.approval_status as enum ('pending', 'approved', 'declined', 'expired');
create type public.booking_status as enum ('reserved', 'confirmed', 'released', 'cancelled', 'delivered');
create type public.payment_status as enum ('pending', 'authorised', 'failed', 'settled', 'refunded');
create type public.tracking_status as enum ('booked', 'collected', 'in_transit', 'delayed', 'delivered', 'cancelled');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  kind public.account_kind not null,
  shipper_type public.shipper_type,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  constraint shipper_type_matches_kind check ((kind = 'shipper') = (shipper_type is not null))
);

create table public.account_members (
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index account_members_user_idx on public.account_members (user_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  mode_preference public.mode_preference not null default 'any',
  length_cm numeric not null check (length_cm > 0),
  width_cm numeric not null check (width_cm > 0),
  height_cm numeric not null check (height_cm > 0),
  weight_kg numeric not null check (weight_kg > 0),
  declared_value_pence bigint not null check (declared_value_pence > 0),
  fragile boolean not null default false,
  dangerous_goods boolean not null default false,
  pickup_location text not null,
  destination_location text not null,
  ready_at timestamptz not null,
  deadline_at timestamptz not null,
  budget_pence bigint not null check (budget_pence > 0),
  urgency public.urgency not null default 'standard',
  optimisation public.optimisation_preference not null default 'balanced',
  status public.shipment_status not null default 'pending_match',
  created_at timestamptz not null default now(),
  constraint deadline_after_ready check (deadline_at > ready_at)
);
create index shipments_account_idx on public.shipments (account_id);

create table public.capacity_listings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  mode public.transport_mode not null,
  origin text not null,
  destination text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  recurrence public.recurrence not null default 'one_off',
  recurrence_rule text,
  total_capacity_kg numeric not null check (total_capacity_kg > 0),
  remaining_capacity_kg numeric not null,
  max_item_weight_kg numeric not null check (max_item_weight_kg > 0),
  max_length_cm numeric not null check (max_length_cm > 0),
  max_width_cm numeric not null check (max_width_cm > 0),
  max_height_cm numeric not null check (max_height_cm > 0),
  base_price_pence bigint not null check (base_price_pence >= 0),
  price_per_kg_pence bigint not null check (price_per_kg_pence >= 0),
  distance_km numeric not null check (distance_km > 0),
  accepts_dangerous_goods boolean not null default false,
  accepts_fragile boolean not null default true,
  is_return_leg boolean not null default false,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arrival_after_departure check (arrival_at > departure_at),
  constraint remaining_within_total check (remaining_capacity_kg >= 0 and remaining_capacity_kg <= total_capacity_kg),
  constraint recurring_has_rule check ((recurrence = 'recurring') = (recurrence_rule is not null))
);
create index capacity_listings_account_idx on public.capacity_listings (account_id);
create index capacity_listings_bookable_idx on public.capacity_listings (status, departure_at) where status = 'active';

create table public.emissions_factors (
  mode public.transport_mode primary key,
  kg_co2_per_tonne_km numeric not null check (kg_co2_per_tonne_km > 0),
  dedicated_vehicle_kg_co2_per_km numeric not null check (dedicated_vehicle_kg_co2_per_km > 0),
  source text not null
);

-- Reference data, not demo data. Keep identical to PROTOTYPE_EMISSIONS_FACTORS in src/lib/domain/emissions.ts.
insert into public.emissions_factors (mode, kg_co2_per_tonne_km, dedicated_vehicle_kg_co2_per_km, source) values
  ('road', 0.105, 0.25, 'prototype placeholder'),
  ('sea', 0.016, 1.2, 'prototype placeholder'),
  ('air', 0.6, 3.5, 'prototype placeholder');

create table public.approval_policies (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  max_auto_price_pence bigint not null default 10000 check (max_auto_price_pence >= 0),
  declared_value_threshold_pence bigint not null default 2000000 check (declared_value_threshold_pence >= 0),
  min_deadline_margin_hours numeric not null default 12 check (min_deadline_margin_hours >= 0),
  updated_at timestamptz not null default now()
);

create table public.match_options (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  capacity_listing_id uuid not null references public.capacity_listings (id) on delete cascade,
  total_price_pence bigint not null check (total_price_pence >= 0),
  arrival_at timestamptz not null,
  deadline_margin_hours numeric not null,
  co2_kg numeric not null check (co2_kg >= 0),
  score numeric not null,
  rank integer not null check (rank >= 1),
  is_exact_match boolean not null,
  compromises text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index match_options_shipment_idx on public.match_options (shipment_id, rank);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  reasons public.approval_reason[] not null check (cardinality(reasons) > 0),
  option_ids uuid[] not null default '{}',
  recommended_option_id uuid references public.match_options (id) on delete set null,
  status public.approval_status not null default 'pending',
  selected_option_id uuid references public.match_options (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint selection_offered check (selected_option_id is null or selected_option_id = any (option_ids)),
  constraint decided_has_time check ((status = 'pending') = (decided_at is null))
);
create index approval_requests_shipment_idx on public.approval_requests (shipment_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  shipper_account_id uuid not null references public.accounts (id) on delete cascade,
  provider_account_id uuid not null references public.accounts (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  capacity_listing_id uuid not null references public.capacity_listings (id) on delete cascade,
  match_option_id uuid references public.match_options (id) on delete set null,
  reserved_weight_kg numeric not null check (reserved_weight_kg > 0),
  price_pence bigint not null check (price_pence >= 0),
  status public.booking_status not null default 'reserved',
  payment_status public.payment_status not null default 'pending',
  payment_reference text,
  receipt_reference text,
  collection_at timestamptz not null,
  eta timestamptz not null,
  co2_kg numeric not null check (co2_kg >= 0),
  co2_saved_kg numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- At most one capacity-holding booking per shipment: the database backstop against double booking.
create unique index bookings_one_active_per_shipment on public.bookings (shipment_id)
  where status in ('reserved', 'confirmed');
create index bookings_shipper_idx on public.bookings (shipper_account_id);
create index bookings_provider_idx on public.bookings (provider_account_id);

create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  shipper_account_id uuid not null references public.accounts (id) on delete cascade,
  provider_account_id uuid not null references public.accounts (id) on delete cascade,
  status public.tracking_status not null,
  message text not null,
  latitude double precision,
  longitude double precision,
  eta timestamptz,
  occurred_at timestamptz not null default now(),
  constraint location_pair check ((latitude is null) = (longitude is null))
);
create index tracking_events_booking_idx on public.tracking_events (booking_id, occurred_at);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_events_account_idx on public.audit_events (account_id, created_at);
