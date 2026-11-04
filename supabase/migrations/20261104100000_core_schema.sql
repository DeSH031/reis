-- «Рейс»: основная схема. Деньги: numeric(14,2). У каждой таблицы есть org_id и RLS.

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','dispatcher','accountant','viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on public.org_members(user_id);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_agency_admin boolean not null default false
);

-- Настройки организации. НДС, топливо, нормы: только значения организации.
-- ВАЖНО: перед работой с реальным клиентом проверить актуальную ставку НДС.
create table public.org_settings (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  requisites jsonb not null default '{}'::jsonb,
  vat_payer boolean not null default false,
  vat_percent numeric(5,2),
  fuel_price numeric(10,2),
  per_diem numeric(10,2),
  depreciation_per_km numeric(10,2),
  overhead_percent numeric(5,2),
  doc_prefix jsonb not null default '{"request":"ЗП","invoice":"СЧ","act":"АКТ","ttn":"ТТН"}'::jsonb,
  margin_alert_percent numeric(5,2),
  act_unsigned_days int,
  vehicle_idle_days int,
  fuel_deviation_percent numeric(5,2),
  timezone text not null default 'Asia/Almaty',
  telegram_chat_id bigint,
  report_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  external_id text,
  name text not null,
  bin text,
  legal_address text,
  contact_name text,
  contact_phone text,
  contract_number text,
  contract_date date,
  payment_terms_days int not null default 14,
  vat_payer boolean not null default false,
  credit_limit numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  unique (org_id, external_id)
);
create index on public.clients(org_id);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  external_id text,
  plate text not null,
  make_model text,
  type text not null default 'tent' check (type in ('tent','refrigerator','dump','container','flatbed')),
  capacity_t numeric(6,2),
  fuel_norm_loaded numeric(5,2),
  fuel_norm_empty numeric(5,2),
  status text not null default 'active' check (status in ('active','repair','inactive')),
  created_at timestamptz not null default now(),
  unique (org_id, external_id)
);
create index on public.vehicles(org_id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  external_id text,
  name text not null,
  phone text,
  pay_scheme text not null default 'per_km' check (pay_scheme in ('per_km','percent','fixed')),
  pay_rate numeric(12,4),
  per_diem numeric(10,2),
  created_at timestamptz not null default now(),
  unique (org_id, external_id)
);
create index on public.drivers(org_id);

create table public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  bin text,
  phone text,
  created_at timestamptz not null default now()
);
create index on public.subcontractors(org_id);

create table public.route_distances (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  origin_city text not null,
  dest_city text not null,
  distance_km int not null check (distance_km > 0),
  unique (org_id, origin_city, dest_city)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  external_id text,
  number text not null,
  client_id uuid references public.clients(id),
  origin_city text not null,
  origin_address text,
  dest_city text not null,
  dest_address text,
  loading_date date,
  unloading_date date,
  cargo_type text,
  cargo_weight_t numeric(8,2),
  cargo_volume_m3 numeric(8,2),
  cargo_description text,
  vehicle_id uuid references public.vehicles(id),
  trailer_plate text,
  driver_id uuid references public.drivers(id),
  subcontractor_id uuid references public.subcontractors(id),
  freight_price numeric(14,2) not null default 0,
  vat_mode text not null default 'none' check (vat_mode in ('incl','excl','none')),
  payment_terms_days int,
  loaded_km int not null default 0,
  empty_km int not null default 0,
  status text not null default 'request' check (status in ('request','assigned','in_transit','delivered','documents','paid','cancelled')),
  notes text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, number),
  unique (org_id, external_id)
);
create index on public.trips(org_id, status);
create index on public.trips(org_id, loading_date);
create index on public.trips(client_id);
create index on public.trips(vehicle_id);
create index on public.trips(driver_id);
create index on public.trips(subcontractor_id);

create table public.trip_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null check (category in ('fuel','driver_pay','tolls','per_diem','repairs','subcontractor','customs','insurance','depreciation','overhead','other')),
  amount numeric(14,2) not null,
  quantity numeric(12,3),
  unit text,
  source text not null default 'actual' check (source in ('actual','estimated')),
  doc_ref text,
  created_by_driver boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.trip_costs(trip_id);
create index on public.trip_costs(org_id);

create table public.trip_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  actor text,
  created_at timestamptz not null default now()
);
create index on public.trip_events(trip_id, created_at);
create index on public.trip_events(org_id);

create table public.trip_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  storage_path text not null,
  kind text not null default 'scan',
  uploaded_by_driver boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.trip_attachments(trip_id);
create index on public.trip_attachments(org_id);

-- Ссылки для водителя: хранится только хэш токена. Доступ только через service role.
create table public.driver_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.driver_links(org_id);
create index on public.driver_links(trip_id);

-- Счётчики нумерации. Доступ только через функцию next_doc_number.
create table public.doc_counters (
  org_id uuid not null references public.orgs(id) on delete cascade,
  doc_type text not null check (doc_type in ('request','invoice','act','ttn')),
  year int not null,
  last_seq int not null default 0,
  primary key (org_id, doc_type, year)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  client_id uuid references public.clients(id),
  doc_type text not null check (doc_type in ('request','invoice','act','ttn')),
  year int not null,
  seq int not null,
  number text not null,
  status text not null default 'draft' check (status in ('draft','issued','signed','sent','paid')),
  issue_date date not null default current_date,
  period_from date,
  period_to date,
  amount_total numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, doc_type, year, seq),
  unique (org_id, doc_type, number)
);
create index on public.documents(org_id, status);
create index on public.documents(trip_id);
create index on public.documents(client_id);

create table public.document_trips (
  document_id uuid not null references public.documents(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  primary key (document_id, trip_id)
);
create index on public.document_trips(org_id);
create index on public.document_trips(trip_id);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  version int not null,
  storage_path text,
  data jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);
create index on public.document_versions(org_id);
create index on public.document_versions(created_by);
create unique index document_versions_one_current on public.document_versions(document_id) where is_current;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  client_id uuid references public.clients(id),
  document_id uuid references public.documents(id),
  paid_at date not null,
  amount numeric(14,2) not null check (amount > 0),
  purpose text,
  source text not null default 'manual' check (source in ('manual','bank_import')),
  match_status text not null default 'confirmed' check (match_status in ('confirmed','suggested','unmatched')),
  external_ref text,
  created_at timestamptz not null default now(),
  unique (org_id, external_ref)
);
create index on public.payments(org_id, paid_at);
create index on public.payments(document_id);
create index on public.payments(client_id);

create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  kind text not null,
  mapping jsonb not null,
  created_at timestamptz not null default now(),
  unique (org_id, kind)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  rule text not null,
  entity_type text,
  entity_id uuid,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','snoozed','dismissed','resolved')),
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index alerts_dedupe on public.alerts(org_id, rule, entity_id) where status in ('open','snoozed');
create index on public.alerts(org_id, status);

create table public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  report_date date not null,
  channel text not null default 'telegram',
  status text not null check (status in ('sent','failed')),
  payload jsonb,
  error text,
  sent_at timestamptz not null default now(),
  unique (org_id, channel, report_date)
);

create table public.telegram_link_codes (
  code text primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  expires_at timestamptz not null
);
create index on public.telegram_link_codes(org_id);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  actor uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log(org_id, created_at);

-- Помощники для RLS
create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m where m.org_id = p_org and m.user_id = (select auth.uid()))
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_agency_admin);
$$;

create or replace function public.has_org_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = any(p_roles))
  or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_agency_admin);
$$;

-- Безрыночная нумерация: INSERT ... ON CONFLICT берёт блокировку строки, два клика не получат один номер.
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, text[]) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

create or replace function public.next_doc_number(p_org uuid, p_type text, p_year int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.doc_counters(org_id, doc_type, year, last_seq)
  values (p_org, p_type, p_year, 1)
  on conflict (org_id, doc_type, year)
  do update set last_seq = public.doc_counters.last_seq + 1
  returning last_seq into v;
  return v;
end $$;
revoke all on function public.next_doc_number(uuid, text, int) from public, anon, authenticated;
grant execute on function public.next_doc_number(uuid, text, int) to service_role;

-- RLS
do $$
declare t text;
begin
  foreach t in array array['orgs','org_members','profiles','org_settings','clients','vehicles','drivers','subcontractors',
    'route_distances','trips','trip_costs','trip_events','trip_attachments','driver_links','doc_counters','documents',
    'document_trips','document_versions','payments','import_mappings','alerts','report_deliveries','telegram_link_codes','audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- чтение: участники организации
  foreach t in array array['org_settings','clients','vehicles','drivers','subcontractors','route_distances','trips','trip_costs',
    'trip_events','trip_attachments','documents','document_trips','document_versions','payments','import_mappings','alerts','report_deliveries']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(org_id))', t||'_sel', t);
  end loop;

  -- запись: разделена на insert/update/delete (как применено в БД)
  foreach t in array array['clients','vehicles','drivers','subcontractors','route_distances','trips','trip_costs','trip_events','trip_attachments']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_org_role(org_id, array[''owner'',''dispatcher'']))', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_org_role(org_id, array[''owner'',''dispatcher''])) with check (public.has_org_role(org_id, array[''owner'',''dispatcher'']))', t||'_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_org_role(org_id, array[''owner'',''dispatcher'']))', t||'_del', t);
  end loop;

  foreach t in array array['documents','document_trips','document_versions']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_org_role(org_id, array[''owner'',''accountant'',''dispatcher'']))', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_org_role(org_id, array[''owner'',''accountant'',''dispatcher''])) with check (public.has_org_role(org_id, array[''owner'',''accountant'',''dispatcher'']))', t||'_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_org_role(org_id, array[''owner'',''accountant'']))', t||'_del', t);
  end loop;

  foreach t in array array['payments','import_mappings']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_org_role(org_id, array[''owner'',''accountant'']))', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_org_role(org_id, array[''owner'',''accountant''])) with check (public.has_org_role(org_id, array[''owner'',''accountant'']))', t||'_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_org_role(org_id, array[''owner'',''accountant'']))', t||'_del', t);
  end loop;
end $$;

create policy orgs_sel on public.orgs for select to authenticated using (public.is_org_member(id));
create policy members_sel on public.org_members for select to authenticated using (user_id = (select auth.uid()) or public.has_org_role(org_id, array['owner']));
create policy members_ins on public.org_members for insert to authenticated with check (public.has_org_role(org_id, array['owner']));
create policy members_upd on public.org_members for update to authenticated using (public.has_org_role(org_id, array['owner'])) with check (public.has_org_role(org_id, array['owner']));
create policy members_del on public.org_members for delete to authenticated using (public.has_org_role(org_id, array['owner']));
create policy profiles_sel on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy settings_upd on public.org_settings for update to authenticated using (public.has_org_role(org_id, array['owner'])) with check (public.has_org_role(org_id, array['owner']));
create policy alerts_upd on public.alerts for update to authenticated using (public.has_org_role(org_id, array['owner','dispatcher','accountant'])) with check (public.has_org_role(org_id, array['owner','dispatcher','accountant']));
create policy audit_sel on public.audit_log for select to authenticated using (public.has_org_role(org_id, array['owner']));
-- driver_links, doc_counters, telegram_link_codes: политик нет, только service role.

insert into storage.buckets (id, name, public) values ('documents','documents',false), ('attachments','attachments',false), ('branding','branding',false)
on conflict (id) do nothing;
