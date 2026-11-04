-- Ссылка водителя: токен хранится только в виде sha256, анонимный доступ только через эти функции.
create or replace function public._tok_hash(p_token text) returns text
language sql immutable as $$ select encode(sha256(convert_to(p_token, 'UTF8')), 'hex') $$;

create or replace function public.create_driver_link(p_trip uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_token text;
begin
  select org_id into v_org from trips where id = p_trip;
  if v_org is null or not has_org_role(v_org, array['owner','dispatcher']) then
    raise exception 'forbidden';
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into driver_links(org_id, trip_id, token_hash, expires_at)
  values (v_org, p_trip, _tok_hash(v_token), now() + interval '14 days');
  return v_token;
end $$;

create or replace function public.driver_get_trip(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l driver_links; t trips; v_costs jsonb;
begin
  select * into l from driver_links where token_hash = _tok_hash(p_token) and expires_at > now();
  if not found then return null; end if;
  select * into t from trips where id = l.trip_id;
  select coalesce(jsonb_agg(jsonb_build_object('category', category, 'amount', amount) order by created_at), '[]'::jsonb)
    into v_costs from trip_costs where trip_id = t.id and created_by_driver;
  return jsonb_build_object(
    'number', t.number, 'status', t.status, 'origin_city', t.origin_city, 'origin_address', t.origin_address,
    'dest_city', t.dest_city, 'dest_address', t.dest_address, 'loading_date', t.loading_date, 'unloading_date', t.unloading_date,
    'cargo', t.cargo_description, 'costs', v_costs);
end $$;

create or replace function public.driver_set_status(p_token text, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
declare l driver_links;
begin
  if p_status not in ('in_transit', 'delivered') then raise exception 'bad status'; end if;
  select * into l from driver_links where token_hash = _tok_hash(p_token) and expires_at > now();
  if not found then return false; end if;
  update trips set status = p_status, updated_at = now(),
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end
  where id = l.trip_id and status in ('assigned', 'in_transit');
  insert into trip_events(org_id, trip_id, kind, payload, actor)
  values (l.org_id, l.trip_id, 'status', jsonb_build_object('status', p_status), 'driver');
  return true;
end $$;

create or replace function public.driver_add_cost(p_token text, p_category text, p_amount numeric) returns boolean
language plpgsql security definer set search_path = public as $$
declare l driver_links;
begin
  if p_category not in ('fuel', 'tolls', 'repairs', 'other') then raise exception 'bad category'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 then raise exception 'bad amount'; end if;
  select * into l from driver_links where token_hash = _tok_hash(p_token) and expires_at > now();
  if not found then return false; end if;
  insert into trip_costs(org_id, trip_id, category, amount, source, created_by_driver)
  values (l.org_id, l.trip_id, p_category, p_amount, 'actual', true);
  insert into trip_events(org_id, trip_id, kind, payload, actor)
  values (l.org_id, l.trip_id, 'cost_added', jsonb_build_object('category', p_category, 'amount', p_amount), 'driver');
  return true;
end $$;

revoke all on function public.create_driver_link(uuid) from public, anon;
grant execute on function public.create_driver_link(uuid) to authenticated;
revoke all on function public.driver_get_trip(text), public.driver_set_status(text, text), public.driver_add_cost(text, text, numeric) from public;
grant execute on function public.driver_get_trip(text), public.driver_set_status(text, text), public.driver_add_cost(text, text, numeric) to anon, authenticated;
revoke all on function public._tok_hash(text) from public;
grant execute on function public._tok_hash(text) to anon, authenticated;
