-- Account creation and the atomic capacity-reservation contract.
-- Contract (mirrored by src/lib/db/memory/bookings.ts):
--   reserve_capacity    → {ok: true, booking} | {ok: false, reason: shipment_not_found | already_booked
--                                                 | listing_unavailable | insufficient_capacity}
--   confirm_booking     → reserved → confirmed            | {ok: false, reason: booking_not_found | not_reserved}
--   release_reservation → reserved → released (+capacity) | {ok: false, reason: booking_not_found | not_reserved}
-- The reservation RPCs run as service_role only: the Next.js server resolves the shipper account from
-- the session and supplies the price/CO₂ computed by the matching engine, so browsers cannot set prices.

create function public.create_account(p_kind public.account_kind, p_shipper_type public.shipper_type, p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_account uuid;
begin
  if v_user is null then
    raise exception 'create_account requires a signed-in user' using errcode = '42501';
  end if;
  insert into public.accounts (kind, shipper_type, name)
    values (p_kind, p_shipper_type, trim(p_name))
    returning id into v_account;
  insert into public.account_members (account_id, user_id, role) values (v_account, v_user, 'owner');
  return v_account;
end;
$$;
revoke execute on function public.create_account(public.account_kind, public.shipper_type, text) from public, anon;
grant execute on function public.create_account(public.account_kind, public.shipper_type, text) to authenticated;

create function public.reserve_capacity(
  p_shipper_account_id uuid,
  p_shipment_id uuid,
  p_listing_id uuid,
  p_price_pence bigint,
  p_co2_kg numeric,
  p_co2_saved_kg numeric,
  p_match_option_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_shipment public.shipments;
  v_listing public.capacity_listings;
  v_booking public.bookings;
begin
  -- Lock the shipment so concurrent reservations for it are serialised.
  select * into v_shipment from public.shipments
    where id = p_shipment_id and account_id = p_shipper_account_id
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'shipment_not_found');
  end if;

  if exists (select 1 from public.bookings
             where shipment_id = p_shipment_id and status in ('reserved', 'confirmed')) then
    return jsonb_build_object('ok', false, 'reason', 'already_booked');
  end if;

  -- Conditional decrement: the row lock taken by UPDATE makes check-and-decrement atomic.
  update public.capacity_listings
    set remaining_capacity_kg = remaining_capacity_kg - v_shipment.weight_kg, updated_at = now()
    where id = p_listing_id and status = 'active' and remaining_capacity_kg >= v_shipment.weight_kg
    returning * into v_listing;
  if not found then
    if exists (select 1 from public.capacity_listings where id = p_listing_id and status = 'active') then
      return jsonb_build_object('ok', false, 'reason', 'insufficient_capacity');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'listing_unavailable');
  end if;

  insert into public.bookings (
    shipper_account_id, provider_account_id, shipment_id, capacity_listing_id, match_option_id,
    reserved_weight_kg, price_pence, collection_at, eta, co2_kg, co2_saved_kg)
  values (
    p_shipper_account_id, v_listing.account_id, p_shipment_id, p_listing_id, p_match_option_id,
    v_shipment.weight_kg, p_price_pence, v_listing.departure_at, v_listing.arrival_at, p_co2_kg, p_co2_saved_kg)
  returning * into v_booking;

  insert into public.audit_events (account_id, action, entity_type, entity_id)
    values (p_shipper_account_id, 'booking.reserved', 'booking', v_booking.id);

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end;
$$;

create function public.confirm_booking(
  p_shipper_account_id uuid,
  p_booking_id uuid,
  p_payment_reference text,
  p_receipt_reference text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
    where id = p_booking_id and shipper_account_id = p_shipper_account_id
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;
  if v_booking.status <> 'reserved' then
    return jsonb_build_object('ok', false, 'reason', 'not_reserved');
  end if;

  update public.bookings
    set status = 'confirmed', payment_status = 'authorised', payment_reference = p_payment_reference,
        receipt_reference = p_receipt_reference, updated_at = now()
    where id = p_booking_id
    returning * into v_booking;
  update public.shipments set status = 'booked' where id = v_booking.shipment_id;
  insert into public.audit_events (account_id, action, entity_type, entity_id)
    values (p_shipper_account_id, 'booking.confirmed', 'booking', p_booking_id);

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end;
$$;

create function public.release_reservation(p_shipper_account_id uuid, p_booking_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
    where id = p_booking_id and shipper_account_id = p_shipper_account_id
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;
  if v_booking.status <> 'reserved' then
    return jsonb_build_object('ok', false, 'reason', 'not_reserved');
  end if;

  update public.bookings set status = 'released', updated_at = now()
    where id = p_booking_id
    returning * into v_booking;
  update public.capacity_listings
    set remaining_capacity_kg = least(total_capacity_kg, remaining_capacity_kg + v_booking.reserved_weight_kg),
        updated_at = now()
    where id = v_booking.capacity_listing_id;
  insert into public.audit_events (account_id, action, entity_type, entity_id)
    values (p_shipper_account_id, 'booking.released', 'booking', p_booking_id);

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end;
$$;

revoke execute on function public.reserve_capacity(uuid, uuid, uuid, bigint, numeric, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.confirm_booking(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.release_reservation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_capacity(uuid, uuid, uuid, bigint, numeric, numeric, uuid) to service_role;
grant execute on function public.confirm_booking(uuid, uuid, text, text) to service_role;
grant execute on function public.release_reservation(uuid, uuid) to service_role;

-- Schema report for `npm run db:verify` (service_role only): RLS status, policies, and RPC privileges.
create function public.autoship_schema_report()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'tables', (
      select jsonb_object_agg(c.relname, jsonb_build_object(
        'rls', c.relrowsecurity,
        'policies', (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)))
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'),
    'functions', (
      select jsonb_object_agg(p.proname, jsonb_build_object(
        'security_definer', p.prosecdef,
        'anon_can_execute', pg_catalog.has_function_privilege('anon', p.oid, 'execute'),
        'authenticated_can_execute', pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'),
        'service_role_can_execute', pg_catalog.has_function_privilege('service_role', p.oid, 'execute')))
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'),
    'bookings_one_active_index', exists (
      select 1 from pg_catalog.pg_indexes
      where schemaname = 'public' and indexname = 'bookings_one_active_per_shipment')
  );
$$;
revoke execute on function public.autoship_schema_report() from public, anon, authenticated;
grant execute on function public.autoship_schema_report() to service_role;
