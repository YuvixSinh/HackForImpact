-- Supabase migrations create tables as postgres, but API roles need explicit SQL grants
-- in addition to RLS policies. RLS still limits authenticated users to policy-approved rows.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on table
  public.accounts,
  public.account_members,
  public.shipments,
  public.capacity_listings,
  public.emissions_factors,
  public.approval_policies,
  public.match_options,
  public.approval_requests,
  public.bookings,
  public.tracking_events,
  public.audit_events
to authenticated;
grant all privileges on table
  public.accounts,
  public.account_members,
  public.shipments,
  public.capacity_listings,
  public.emissions_factors,
  public.approval_policies,
  public.match_options,
  public.approval_requests,
  public.bookings,
  public.tracking_events,
  public.audit_events
to service_role;

-- Expose the table grants to the hosted schema verifier.
create or replace function public.autoship_schema_report()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'tables', (
      select jsonb_object_agg(c.relname, jsonb_build_object(
        'rls', c.relrowsecurity,
        'policies', (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename = c.relname),
        'service_role_can_select', pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT'),
        'authenticated_can_select', pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT')))
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
