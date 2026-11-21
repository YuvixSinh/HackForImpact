-- The API role grants added for hosted checks must preserve provider column restrictions.
revoke update on table public.capacity_listings from authenticated;
grant update (
  mode, origin, destination, departure_at, arrival_at, recurrence, recurrence_rule,
  max_item_weight_kg, max_length_cm, max_width_cm, max_height_cm, base_price_pence,
  price_per_kg_pence, distance_km, accepts_dangerous_goods, accepts_fragile, is_return_leg,
  status, updated_at
) on table public.capacity_listings to authenticated;
