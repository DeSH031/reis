-- Детерминированный демо-сид. Все значения демонстрационные. Ставки НДС/топлива/норм — демо-значения организации.
create or replace function public._h(s text) returns numeric
language sql immutable parallel safe set search_path = '' as
$$ select (abs(hashtext(s)::bigint) % 10000) / 10000.0 $$;

create or replace function public.seed_demo(p_org uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  vat numeric := 12;      -- ДЕМО-значение. Перед работой с реальным клиентом проверить актуальную ставку НДС.
  fuelp numeric := 300;   -- ДЕМО-цена топлива, ₸/л
  perd numeric := 5000;   -- ДЕМО-суточные, ₸/сутки
  depr numeric := 70;     -- ДЕМО-амортизация, ₸/км
  today date := current_date;
  res jsonb;
begin
  if not exists (select 1 from orgs where id = p_org and is_demo) then
    raise exception 'seed_demo: только для демо-организации';
  end if;

  delete from payments where org_id = p_org;
  delete from document_versions where org_id = p_org;
  delete from document_trips where org_id = p_org;
  delete from documents where org_id = p_org;
  delete from trip_costs where org_id = p_org;
  delete from trip_events where org_id = p_org;
  delete from trip_attachments where org_id = p_org;
  delete from driver_links where org_id = p_org;
  delete from alerts where org_id = p_org;
  delete from report_deliveries where org_id = p_org;
  delete from trips where org_id = p_org;
  delete from doc_counters where org_id = p_org;
  delete from route_distances where org_id = p_org;
  delete from clients where org_id = p_org;
  delete from vehicles where org_id = p_org;
  delete from drivers where org_id = p_org;
  delete from subcontractors where org_id = p_org;

  insert into org_settings(org_id, requisites, vat_payer, vat_percent, fuel_price, per_diem, depreciation_per_km,
    margin_alert_percent, act_unsigned_days, vehicle_idle_days, fuel_deviation_percent)
  values (p_org, jsonb_build_object('name','ТОО «Демо Транс» (демо)','bin','999000000001',
    'address','г. Алматы, ул. Демонстрационная, 1 (вымышленный адрес)','bank','Демо-банк','bik','DEMOKZKA',
    'iik','KZ00DEMO000000000000','kbe','17','director','Образцов А.А.','accountant','Примерова Б.Б.'),
    true, vat, fuelp, perd, depr, 8, 5, 5, 15)
  on conflict (org_id) do update set requisites = excluded.requisites, vat_payer = excluded.vat_payer,
    vat_percent = excluded.vat_percent, fuel_price = excluded.fuel_price, per_diem = excluded.per_diem,
    depreciation_per_km = excluded.depreciation_per_km, margin_alert_percent = excluded.margin_alert_percent,
    act_unsigned_days = excluded.act_unsigned_days, vehicle_idle_days = excluded.vehicle_idle_days,
    fuel_deviation_percent = excluded.fuel_deviation_percent, updated_at = now();

  -- справочники
  insert into clients(id, org_id, external_id, name, bin, legal_address, contact_name, contact_phone, contract_number, contract_date, payment_terms_days, vat_payer)
  select md5('client'||i)::uuid, p_org, 'c'||i,
    (array['Северный Ветер','Степная Логистика','Алтын Трейд','Восток Снаб','Арман Продукт','Золотой Колос','Каспий Опт','Нур Строй',
           'Тянь-Шань Фуд','Горный Мёд','Сары-Арка Агро','Жайык Маркет','Евразия Метиз','Байтерек Мебель','Каскад Техно',
           'Дала Сервис','Ак-Бидай','Сункар Групп','Мерей Фарма','Ертіс Лес','Балхаш Металл','Онтүстік Базар','Қазына Пласт',
           'Шанырақ Дом','Тулпар Моторс'])[i],
    '999'||lpad(i::text, 9, '0'), 'г. Демоград, ул. Вымышленная, '||i,
    'Контакт '||i, '+7 000 000 00 '||lpad(i::text,2,'0'), 'ДГ-'||lpad(i::text,3,'0'), today - (200 + i*7),
    (array[7,14,21,30])[1 + i % 4], i % 5 <> 0
  from generate_series(1,25) i;

  insert into vehicles(id, org_id, external_id, plate, make_model, type, capacity_t, fuel_norm_loaded, fuel_norm_empty)
  select md5('veh'||i)::uuid, p_org, 'v'||i, '000DM'||lpad(i::text,2,'0'),
    (array['Shacman X3000','Howo T7H','Volvo FH','Mercedes Actros','КамАЗ 5490'])[1 + i % 5],
    case when i <= 8 then 'tent' when i <= 11 then 'refrigerator' else 'dump' end,
    case when i <= 11 then 20 else 25 end,
    case when i <= 8 then 32 when i <= 11 then 36 else 38 end,
    case when i <= 8 then 22 when i <= 11 then 26 else 28 end
  from generate_series(1,14) i;

  insert into drivers(id, org_id, external_id, name, phone, pay_scheme, pay_rate, per_diem)
  select md5('drv'||i)::uuid, p_org, 'd'||i,
    (array['Берик','Данияр'])[1 + i % 2]||' '||(array['Тестов','Образцов','Демов','Примеров','Макетов','Пробников','Шаблонов','Эталонов'])[1 + i % 8],
    '+7 000 111 00 '||lpad(i::text,2,'0'),
    (array['fixed','per_km','percent'])[1 + i % 3],
    case i % 3 when 1 then 85 when 2 then 14 else null end,  -- per_km: ₸/км; percent: % от ставки; fixed: считается по дальности (демо)
    perd
  from generate_series(1,16) i;

  insert into subcontractors(org_id, name, bin, phone)
  select p_org, 'ИП «Перевозчик '||i||'» (демо)', '999'||lpad((900+i)::text,9,'0'), '+7 000 222 00 0'||i from generate_series(1,3) i;

  create temp table _routes(id int, o text, d text, km int, rate numeric, es numeric) on commit drop;
  insert into _routes values
   (1,'Алматы','Астана',1200,410,0.15),(2,'Астана','Алматы',1200,380,0.35),(3,'Алматы','Караганда',1000,400,0.15),
   (4,'Алматы','Шымкент',690,420,0.2),(5,'Шымкент','Алматы',690,390,0.3),(6,'Астана','Караганда',220,520,0.1),
   (7,'Астана','Павлодар',430,410,0.2),(8,'Астана','Костанай',650,400,0.25),(9,'Караганда','Усть-Каменогорск',980,410,0.2),
   (10,'Павлодар','Усть-Каменогорск',480,400,0.2),(11,'Атырау','Актобе',800,300,0.95),(12,'Актобе','Атырау',800,310,0.95),
   (13,'Алматы','Хоргос (граница)',330,380,0.85);
  insert into route_distances(org_id, origin_city, dest_city, distance_km)
  select p_org, o, d, km from _routes;

  -- рейсы
  create temp table _t on commit drop as
  with base as (
    select g,
      case when g = 1 then 1 else 1 + floor(_h('r'||g)*13)::int end as rid,
      case when g = 1 then 1 else 1 + floor(power(_h('c'||g),1.7)*25)::int end as cid,
      case when g = 1 then 1 else 1 + floor(_h('v'||g)*14)::int end as vid,
      case when g = 1 then today - 1
           when _h('f'||g) < 0.03 then today + 1 + floor(_h('fd'||g)*6)::int
           else today - floor(_h('d'||g)*243)::int end as ldate,
      _h('k'||g) as hk, _h('p'||g) as hp, _h('s'||g) as hs, _h('m'||g) as hm, _h('x'||g) as hx
    from generate_series(1,450) g
  ), calc as (
    select b.*, r.o, r.d, r.es,
      (r.km + floor(b.hk*20)::int - 10) as km,
      round(r.km * r.rate * (0.9 + 0.2*b.hp), -3) as net,
      (b.hs > 0.97 and b.g <> 1) as is_sub,
      case when b.hm < 0.6 then 'incl' when b.hm < 0.8 then 'excl' else 'none' end as vat_mode
    from base b join _routes r on r.id = b.rid
  ), calc2 as (
    select c.*, floor(c.km * c.es)::int as ekm,
      c.ldate + ceil(c.km/600.0)::int as udate
    from calc c
  ), st as (
    select c.*, (today - c.ldate) as age,
      case
        when c.ldate > today then case when c.hm < 0.5 then 'request' else 'assigned' end
        when c.hx < 0.03 and c.g <> 1 and (today - c.ldate) > 5 then 'cancelled'
        when c.udate > today then 'in_transit'
        when (today - c.ldate) <= 6 then 'delivered'
        when (today - c.ldate) <= 12 then 'documents'
        else 'paid' end as status
    from calc2 c
  )
  select st.*, cl.payment_terms_days as terms,
    (st.cid = 2) as late_client,
    row_number() over (order by st.g) as rn
  from st join clients cl on cl.org_id = p_org and cl.external_id = 'c'||st.cid;

  -- сюжеты для демо
  alter table _t add column story text;
  update _t set story = 'overdue' where g in (
    select g from (select g, row_number() over (order by _h('ov'||g)) rn from _t where status='paid' and age between 35 and 110 and not late_client and not is_sub) q where rn <= 6
    union all
    select g from (select g, row_number() over (order by _h('ov'||g)) rn from _t where status='paid' and age between 35 and 110 and late_client and not is_sub) q where rn <= 6);
  update _t set status = 'documents' where story = 'overdue';
  update _t set story = 'unsigned' where g in (select g from (select g, row_number() over (order by _h('un'||g)) rn from _t where status='documents' and story is null) q where rn <= 9);
  update _t set story = 'missing' where g in (select g from (select g, row_number() over (order by _h('ms'||g)) rn from _t where status='delivered' and not is_sub) q where rn <= 6);
  update _t set story = 'fuel_anomaly' where g in (select min(g) from _t where status='paid' and vid in (4,9) and not is_sub group by vid);
  update _t set story = 'thin_sub' where g = (select min(g) from _t where status='paid' and is_sub);

  insert into trips(id, org_id, external_id, number, client_id, origin_city, origin_address, dest_city, dest_address, loading_date, unloading_date,
    cargo_type, cargo_weight_t, vehicle_id, driver_id, subcontractor_id, freight_price, vat_mode, payment_terms_days, loaded_km, empty_km,
    status, delivered_at)
  select md5('trip'||t.g)::uuid, p_org, 'T'||t.g,
    'РЕЙС-'||lpad(t.rn::text,4,'0'),
    md5('client'||t.cid)::uuid, t.o, 'Склад отправителя, '||t.o, t.d, 'Склад получателя, '||t.d, t.ldate, t.udate,
    case when t.is_sub or t.vid <= 8 then (array['Генеральный груз','Оборудование','Стройматериалы'])[1 + floor(t.hp*3)::int]
         when t.vid <= 11 then 'Продукты (охлаждённые)' else (array['Щебень','Песок'])[1 + floor(t.hp*2)::int] end,
    round((12 + t.hk*10)::numeric, 1),
    case when t.is_sub then null else md5('veh'||t.vid)::uuid end,
    case when t.is_sub then null else md5('drv'||(case when t.hs < 0.1 then 15 + t.g % 2 else t.vid end))::uuid end,
    case when t.is_sub then (select id from subcontractors where org_id = p_org order by name limit 1 offset (t.g % 3)) end,
    case t.vat_mode when 'incl' then round(t.net*(1+vat/100), -3) else t.net end,
    t.vat_mode, t.terms, t.km, t.ekm, t.status,
    case when t.status in ('delivered','documents','paid') then (t.udate::timestamp + interval '14 hours') end
  from _t t;

  -- расходы
  insert into trip_costs(org_id, trip_id, category, amount, quantity, unit, source)
  select p_org, md5('trip'||t.g)::uuid, 'fuel',
    round(liters * fuelp * (case when t.story = 'fuel_anomaly' then 1.4 when t.ldate between today-120 and today-91 then 1.12 else 1 end), 2),
    round(liters * (case when t.story = 'fuel_anomaly' then 1.4 when t.ldate between today-120 and today-91 then 1.12 else 1 end), 1), 'л',
    case when t.status in ('in_transit','delivered') then 'estimated' else 'actual' end
  from _t t join vehicles v on v.id = md5('veh'||t.vid)::uuid,
    lateral (select (t.km * v.fuel_norm_loaded + t.ekm * v.fuel_norm_empty) / 100.0 as liters) l
  where not t.is_sub and t.status in ('in_transit','delivered','documents','paid') and coalesce(t.story,'') <> 'missing';

  insert into trip_costs(org_id, trip_id, category, amount, source)
  select p_org, md5('trip'||t.g)::uuid, 'driver_pay',
    case d.pay_scheme when 'per_km' then d.pay_rate * (t.km + t.ekm)
                      when 'percent' then round(t.net * d.pay_rate / 100, 2)
                      else round(t.km * 90.0, -3) end,
    case when t.status in ('in_transit','delivered') then 'estimated' else 'actual' end
  from _t t join drivers d on d.id = md5('drv'||(case when t.hs < 0.1 then 15 + t.g % 2 else t.vid end))::uuid
  where not t.is_sub and t.status in ('in_transit','delivered','documents','paid') and coalesce(t.story,'') <> 'missing';

  insert into trip_costs(org_id, trip_id, category, amount, source)
  select p_org, md5('trip'||t.g)::uuid, 'tolls', round(2000 + t.hk*10000, -2), 'actual'
  from _t t where not t.is_sub and t.status in ('delivered','documents','paid') and _h('tl'||t.g) < 0.6 and coalesce(t.story,'') <> 'missing';

  insert into trip_costs(org_id, trip_id, category, amount, source)
  select p_org, md5('trip'||t.g)::uuid, 'per_diem', ceil((t.km + t.ekm)/600.0) * perd, 'actual'
  from _t t where not t.is_sub and t.status in ('delivered','documents','paid') and coalesce(t.story,'') <> 'missing';

  insert into trip_costs(org_id, trip_id, category, amount, source)
  select p_org, md5('trip'||t.g)::uuid, 'depreciation', (t.km + t.ekm) * depr, 'actual'
  from _t t where not t.is_sub and t.status in ('in_transit','delivered','documents','paid');

  -- месяц с просадкой маржи: топливо дороже (выше) и внеплановые ремонты
  insert into trip_costs(org_id, trip_id, category, amount, source, doc_ref)
  select p_org, md5('trip'||t.g)::uuid, 'repairs', round(80000 + _h('rp'||t.g)*220000, -3), 'actual', 'Внеплановый ремонт (демо)'
  from _t t where not t.is_sub and t.status = 'paid' and t.ldate between today-120 and today-91 and _h('rpq'||t.g) < 0.3;

  insert into trip_costs(org_id, trip_id, category, amount, source)
  select p_org, md5('trip'||t.g)::uuid, 'subcontractor',
    round(t.net * (case when t.story = 'thin_sub' then 0.97 else 0.84 + 0.06*t.hp end), 2),
    case when t.status in ('in_transit','delivered') then 'estimated' else 'actual' end
  from _t t where t.is_sub and t.status in ('in_transit','delivered','documents','paid');

  -- события
  insert into trip_events(org_id, trip_id, kind, payload, actor, created_at)
  select p_org, md5('trip'||t.g)::uuid, 'created', '{}'::jsonb, 'система', t.ldate::timestamp - interval '2 days' from _t t;
  insert into trip_events(org_id, trip_id, kind, payload, actor, created_at)
  select p_org, md5('trip'||t.g)::uuid, 'status', jsonb_build_object('status', t.status), 'система', t.udate::timestamp
  from _t t where t.status in ('in_transit','delivered','documents','paid');

  -- ссылка водителя для рейса в пути (демо-токен: demo-live-driver-token, хранится только sha256)
  insert into driver_links(org_id, trip_id, token_hash, expires_at)
  select p_org, md5('trip1')::uuid, encode(sha256(convert_to('demo-live-driver-token','utf8')),'hex'), now() + interval '60 days';

  -- документы
  create temp table _d on commit drop as
  with src as (
    select t.*, doc.doc_type,
      case doc.doc_type when 'request' then least(t.ldate - 1, today) when 'ttn' then least(t.ldate, today)
           else least(t.udate + 1, today) end as issue_date
    from _t t cross join (values ('request'),('ttn'),('invoice'),('act')) as doc(doc_type)
    where (doc.doc_type in ('request','ttn') and t.status in ('assigned','in_transit','delivered','documents','paid'))
       or (doc.doc_type in ('invoice','act') and t.status in ('delivered','documents','paid'))
  )
  select s.*, extract(year from s.issue_date)::int as yr,
    row_number() over (partition by s.doc_type, extract(year from s.issue_date) order by s.issue_date, s.g) as seq
  from src s;

  insert into documents(id, org_id, trip_id, client_id, doc_type, year, seq, number, status, issue_date, amount_total, vat_amount, locked)
  select md5('doc'||d.g||d.doc_type)::uuid, p_org, md5('trip'||d.g)::uuid, md5('client'||d.cid)::uuid, d.doc_type, d.yr, d.seq,
    (case d.doc_type when 'request' then 'ЗП' when 'ttn' then 'ТТН' when 'invoice' then 'СЧ' else 'АКТ' end)||'-'||d.yr||'-'||lpad(d.seq::text,4,'0'),
    case
      when d.doc_type in ('request','ttn') then case when d.status in ('documents','paid') then 'signed' else 'issued' end
      when d.doc_type = 'invoice' then case d.status when 'paid' then 'paid' else 'issued' end
      else case when d.status = 'paid' then 'signed' when d.status = 'delivered' then 'draft'
                when d.story = 'unsigned' then 'sent' else 'signed' end end,
    d.issue_date,
    case d.vat_mode when 'excl' then round(d.net * (1 + vat/100), 2) when 'incl' then round(d.net*(1+vat/100), -3) else d.net end,
    case d.vat_mode when 'excl' then round(d.net * vat/100, 2) when 'incl' then round(round(d.net*(1+vat/100), -3) * vat/(100+vat), 2) else 0 end,
    false
  from _d d;
  update documents set locked = true where org_id = p_org and status in ('signed','paid');

  insert into document_trips(document_id, trip_id, org_id)
  select md5('doc'||d.g||d.doc_type)::uuid, md5('trip'||d.g)::uuid, p_org from _d d;
  insert into document_versions(org_id, document_id, version, data, is_current)
  select p_org, md5('doc'||d.g||d.doc_type)::uuid, 1, jsonb_build_object('demo', true), true from _d d;

  insert into doc_counters(org_id, doc_type, year, last_seq)
  select p_org, doc_type, yr, max(seq) from _d group by doc_type, yr;

  -- платежи по оплаченным рейсам
  insert into payments(org_id, client_id, document_id, paid_at, amount, purpose, source, match_status, external_ref)
  select p_org, md5('client'||d.cid)::uuid, md5('doc'||d.g||'invoice')::uuid,
    least(today, d.issue_date + d.terms + case when d.late_client then 35 + floor(_h('dl'||d.g)*15)::int else floor(_h('dl'||d.g)*7)::int - 2 end),
    (select amount_total from documents where id = md5('doc'||d.g||'invoice')::uuid),
    'Оплата по счёту '||(select number from documents where id = md5('doc'||d.g||'invoice')::uuid),
    case when d.g % 2 = 0 then 'bank_import' else 'manual' end, 'confirmed', 'DEMO-'||d.g
  from _d d where d.doc_type = 'invoice' and d.status = 'paid';

  select jsonb_build_object(
    'clients', (select count(*) from clients where org_id = p_org),
    'vehicles', (select count(*) from vehicles where org_id = p_org),
    'drivers', (select count(*) from drivers where org_id = p_org),
    'trips', (select count(*) from trips where org_id = p_org),
    'costs', (select count(*) from trip_costs where org_id = p_org),
    'documents', (select count(*) from documents where org_id = p_org),
    'payments', (select count(*) from payments where org_id = p_org)) into res;
  return res;
end $$;
revoke all on function public.seed_demo(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo(uuid) to service_role;
