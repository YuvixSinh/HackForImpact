-- Row-level security: every account-scoped record is visible only to members of its account.
-- Exceptions: bookable capacity listings and emissions factors are readable by any signed-in user
-- (the controlled matching read). Bookings are written only through the reservation RPCs.

-- Helpers are SECURITY DEFINER so policies can consult account_members without recursive RLS.
create function public.is_account_member(target_account uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.account_members m
    where m.account_id = target_account and m.user_id = (select auth.uid())
  );
$$;

create function public.account_kind_of(target_account uuid)
returns public.account_kind
language sql stable security definer set search_path = ''
as $$
  select a.kind from public.accounts a where a.id = target_account;
$$;

revoke execute on function public.is_account_member(uuid) from public, anon;
revoke execute on function public.account_kind_of(uuid) from public, anon;
grant execute on function public.is_account_member(uuid) to authenticated, service_role;
grant execute on function public.account_kind_of(uuid) to authenticated, service_role;

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.shipments enable row level security;
alter table public.capacity_listings enable row level security;
alter table public.emissions_factors enable row level security;
alter table public.approval_policies enable row level security;
alter table public.match_options enable row level security;
alter table public.approval_requests enable row level security;
alter table public.bookings enable row level security;
alter table public.tracking_events enable row level security;
alter table public.audit_events enable row level security;

-- Accounts and memberships: readable by members; created only via create_account().
create policy accounts_select_member on public.accounts
  for select to authenticated using (public.is_account_member(id));

create policy account_members_select_member on public.account_members
  for select to authenticated using (user_id = (select auth.uid()) or public.is_account_member(account_id));

-- Shipments: shipper account members only.
create policy shipments_select_member on public.shipments
  for select to authenticated using (public.is_account_member(account_id));
create policy shipments_insert_shipper on public.shipments
  for insert to authenticated
  with check (public.is_account_member(account_id) and public.account_kind_of(account_id) = 'shipper'
              and status = 'pending_match');
create policy shipments_update_member on public.shipments
  for update to authenticated
  using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy shipments_delete_member on public.shipments
  for delete to authenticated using (public.is_account_member(account_id));

-- Capacity listings: owners manage their own; any signed-in user may read bookable listings.
create policy capacity_select_owner_or_bookable on public.capacity_listings
  for select to authenticated
  using (public.is_account_member(account_id) or (status = 'active' and remaining_capacity_kg > 0));
create policy capacity_insert_provider on public.capacity_listings
  for insert to authenticated
  with check (public.is_account_member(account_id) and public.account_kind_of(account_id) = 'provider'
              and remaining_capacity_kg = total_capacity_kg);
create policy capacity_update_owner on public.capacity_listings
  for update to authenticated
  using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy capacity_delete_owner on public.capacity_listings
  for delete to authenticated using (public.is_account_member(account_id));

-- Providers may edit listing details but not capacity figures: those change only through reservations.
revoke update on public.capacity_listings from authenticated;
grant update (mode, origin, destination, departure_at, arrival_at, recurrence, recurrence_rule,
              max_item_weight_kg, max_length_cm, max_width_cm, max_height_cm, base_price_pence,
              price_per_kg_pence, distance_km, accepts_dangerous_goods, accepts_fragile, is_return_leg,
              status, updated_at)
  on public.capacity_listings to authenticated;

-- Emissions factors: shared reference data, read-only to signed-in users.
create policy emissions_select_authenticated on public.emissions_factors
  for select to authenticated using (true);

-- Approval policies: shipper account members.
create policy policies_select_member on public.approval_policies
  for select to authenticated using (public.is_account_member(account_id));
create policy policies_insert_shipper on public.approval_policies
  for insert to authenticated
  with check (public.is_account_member(account_id) and public.account_kind_of(account_id) = 'shipper');
create policy policies_update_member on public.approval_policies
  for update to authenticated
  using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));

-- Match options and approval requests: the shipment's account only.
create policy matches_all_member on public.match_options
  for all to authenticated
  using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id)
              and exists (select 1 from public.shipments s where s.id = shipment_id and s.account_id = match_options.account_id));

create policy approvals_select_member on public.approval_requests
  for select to authenticated using (public.is_account_member(account_id));
create policy approvals_insert_member on public.approval_requests
  for insert to authenticated
  with check (public.is_account_member(account_id) and status = 'pending'
              and exists (select 1 from public.shipments s where s.id = shipment_id and s.account_id = approval_requests.account_id));
create policy approvals_update_member on public.approval_requests
  for update to authenticated
  using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));

-- Bookings: readable by the shipper and provider accounts; no direct writes (RPCs only).
create policy bookings_select_party on public.bookings
  for select to authenticated
  using (public.is_account_member(shipper_account_id) or public.is_account_member(provider_account_id));

-- Tracking: readable by both parties; posted only by the booking's provider.
create policy tracking_select_party on public.tracking_events
  for select to authenticated
  using (public.is_account_member(shipper_account_id) or public.is_account_member(provider_account_id));
create policy tracking_insert_provider on public.tracking_events
  for insert to authenticated
  with check (
    public.is_account_member(provider_account_id)
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.provider_account_id = tracking_events.provider_account_id
        and b.shipper_account_id = tracking_events.shipper_account_id
    )
  );

-- Audit: members read their account's trail and may append entries attributed to themselves.
create policy audit_select_member on public.audit_events
  for select to authenticated using (public.is_account_member(account_id));
create policy audit_insert_self on public.audit_events
  for insert to authenticated
  with check (public.is_account_member(account_id) and actor_user_id = (select auth.uid()));

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;
