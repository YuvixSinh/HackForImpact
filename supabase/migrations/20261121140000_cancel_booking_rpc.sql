-- Disruption handling (Phase 5): cancel an active booking and restore its capacity exactly once.
--   cancel_booking → reserved | confirmed → cancelled (+capacity) | {ok: false, reason: booking_not_found | not_active}
-- Runs as service_role only: the Next.js server resolves the acting account (the booking's provider or
-- shipper) from the session, mirroring the in-memory BookingRepository.cancel.

create function public.cancel_booking(p_account_id uuid, p_booking_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
    where id = p_booking_id
      and (shipper_account_id = p_account_id or provider_account_id = p_account_id)
    for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;
  if v_booking.status not in ('reserved', 'confirmed') then
    return jsonb_build_object('ok', false, 'reason', 'not_active');
  end if;

  update public.bookings set status = 'cancelled', updated_at = now()
    where id = p_booking_id
    returning * into v_booking;
  update public.capacity_listings
    set remaining_capacity_kg = least(total_capacity_kg, remaining_capacity_kg + v_booking.reserved_weight_kg),
        updated_at = now()
    where id = v_booking.capacity_listing_id;
  insert into public.audit_events (account_id, action, entity_type, entity_id)
    values (v_booking.shipper_account_id, 'booking.cancelled', 'booking', p_booking_id);

  return jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
end;
$$;

revoke execute on function public.cancel_booking(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking(uuid, uuid) to service_role;
