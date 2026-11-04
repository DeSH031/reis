-- Выдача следующего номера документа (атомарно, без пропусков).
-- Счётчик никогда не отстаёт от уже существующих документов (важно после сида демо-данных).
drop function if exists public.issue_doc_number(uuid, text, int);

create function public.issue_doc_number(p_org uuid, p_type text, p_year int default extract(year from current_date)::int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_seq int;
  v_max int;
  v_prefix text;
begin
  if not public.has_org_role(p_org, array['owner','accountant','dispatcher']) then
    raise exception 'Недостаточно прав для формирования документа';
  end if;

  select coalesce(max(seq), 0) into v_max from public.documents where org_id = p_org and doc_type = p_type and year = p_year;

  insert into public.doc_counters(org_id, doc_type, year, last_seq)
  values (p_org, p_type, p_year, v_max + 1)
  on conflict (org_id, doc_type, year)
  do update set last_seq = greatest(public.doc_counters.last_seq, v_max) + 1
  returning last_seq into v_seq;

  select coalesce(doc_prefix->>p_type, case p_type when 'request' then 'ЗП' when 'ttn' then 'ТТН' when 'invoice' then 'СЧ' else 'АКТ' end)
  into v_prefix from public.org_settings where org_id = p_org;
  v_prefix := coalesce(v_prefix, case p_type when 'request' then 'ЗП' when 'ttn' then 'ТТН' when 'invoice' then 'СЧ' else 'АКТ' end);

  return jsonb_build_object('seq', v_seq, 'number', v_prefix || '-' || p_year || '-' || lpad(v_seq::text, 4, '0'), 'year', p_year);
end $$;

revoke all on function public.issue_doc_number(uuid, text, int) from public, anon;
grant execute on function public.issue_doc_number(uuid, text, int) to authenticated;
