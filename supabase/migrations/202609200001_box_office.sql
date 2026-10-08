-- Apply once in a dedicated Supabase project. No data reset or DROP statements.
begin;
create table public.movies (
  movie_cd text primary key check (btrim(movie_cd) <> ''),
  movie_nm text not null check (btrim(movie_nm) <> ''),
  open_dt date,
  metadata_observed_at timestamptz not null
);
create table public.box_office_periods (
  id bigint generated always as identity primary key,
  period_type text not null check (period_type in ('daily','weekly','weekend')),
  target_date date not null,
  range_start date not null,
  range_end date not null,
  raw_response jsonb not null check (jsonb_typeof(raw_response) = 'object'),
  row_count smallint not null check (row_count between 0 and 10),
  fetched_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > fetched_at),
  schema_version smallint not null default 1 check (schema_version > 0),
  unique(period_type, target_date),
  check (
    (period_type = 'daily' and target_date = range_start and range_start = range_end) or
    (period_type = 'weekly' and extract(isodow from target_date) = 1 and range_start = target_date and range_end = target_date + 6) or
    (period_type = 'weekend' and extract(isodow from target_date) = 1 and range_start = target_date + 4 and range_end = target_date + 6)
  )
);
create table public.box_office_entries (
  period_id bigint not null references public.box_office_periods(id) on delete cascade,
  movie_cd text not null references public.movies(movie_cd) on delete restrict,
  rank smallint not null check (rank between 1 and 10),
  sales_amt bigint not null,
  audi_cnt bigint not null,
  sales_acc bigint not null,
  audi_acc bigint not null,
  primary key(period_id, movie_cd),
  unique(period_id, rank)
);
create index box_office_entries_movie_idx on public.box_office_entries(movie_cd);
alter table public.movies enable row level security;
alter table public.box_office_periods enable row level security;
alter table public.box_office_entries enable row level security;
revoke all on public.movies, public.box_office_periods, public.box_office_entries from public, anon, authenticated;
grant select, insert, update, delete on public.movies, public.box_office_periods, public.box_office_entries to service_role;
grant usage, select on sequence public.box_office_periods_id_seq to service_role;

create function public.read_box_office_period(p_period text, p_target date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id::text, 'period', p.period_type, 'targetDate', p.target_date::text,
    'rangeStart', p.range_start::text, 'rangeEnd', p.range_end::text,
    'rawResponse', p.raw_response, 'rowCount', p.row_count,
    'fetchedAt', p.fetched_at, 'expiresAt', p.expires_at, 'schemaVersion', p.schema_version,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'movieCd', m.movie_cd, 'movieNm', m.movie_nm, 'openDt', m.open_dt::text,
        'rank', e.rank, 'salesAmt', e.sales_amt::text, 'audiCnt', e.audi_cnt::text,
        'salesAcc', e.sales_acc::text, 'audiAcc', e.audi_acc::text
      ) order by e.rank)
      from public.box_office_entries e join public.movies m on m.movie_cd = e.movie_cd
      where e.period_id = p.id
    ), '[]'::jsonb)
  ) from public.box_office_periods p where p.period_type = p_period and p.target_date = p_target;
$$;

create function public.save_box_office_period(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  d jsonb := p_payload->'data';
  items jsonb := d->'items';
  item jsonb;
  period_kind text := d->>'period';
  target date := (d->>'targetDate')::date;
  started timestamptz := (p_payload->>'fetchedAt')::timestamptz;
  v_period_id bigint;
  old_time timestamptz;
  count_items integer;
begin
  if jsonb_typeof(p_payload) is distinct from 'object'
     or jsonb_typeof(items) is distinct from 'array'
     or jsonb_typeof(p_payload->'rawResponse') is distinct from 'object'
     or period_kind is null or period_kind not in ('daily','weekly','weekend')
     or target is null or started is null then
    raise exception 'Invalid payload';
  end if;
  if (p_payload->'rawResponse'->'boxOfficeResult'->>'showRange') is distinct from
       replace(d->>'rangeStart','-','') || '~' || replace(d->>'rangeEnd','-','')
     or jsonb_typeof(p_payload->'rawResponse'->'boxOfficeResult'->(case when period_kind='daily' then 'dailyBoxOfficeList' else 'weeklyBoxOfficeList' end)) is distinct from 'array' then
    raise exception 'Invalid raw period';
  end if;
  count_items := jsonb_array_length(items);
  if jsonb_array_length(p_payload->'rawResponse'->'boxOfficeResult'->(case when period_kind='daily' then 'dailyBoxOfficeList' else 'weeklyBoxOfficeList' end)) <> count_items then
    raise exception 'Raw row count mismatch';
  end if;
  if count_items > 10 then raise exception 'Too many entries'; end if;
  if (select count(distinct x->>'movieCd') from jsonb_array_elements(items) x) <> count_items
     or (select count(distinct x->>'rank') from jsonb_array_elements(items) x) <> count_items then
    raise exception 'Duplicate or missing entry keys';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(period_kind || ':' || target::text, 0));
  select p.id, p.fetched_at into v_period_id, old_time from public.box_office_periods p
    where p.period_type = period_kind and p.target_date = target;
  if old_time >= started then
    return jsonb_build_object('saved', false);
  end if;
  -- Consistent movie lock order prevents deadlocks across different periods.
  for item in select x from jsonb_array_elements(items) x order by x->>'movieCd' loop
    if jsonb_typeof(item) is distinct from 'object'
       or coalesce(item->>'movieCd','') = '' or coalesce(item->>'movieNm','') = '' then
      raise exception 'Invalid movie';
    end if;
    insert into public.movies(movie_cd, movie_nm, open_dt, metadata_observed_at)
      values(item->>'movieCd', item->>'movieNm', (item->>'openDt')::date, started)
      on conflict(movie_cd) do update set movie_nm=excluded.movie_nm, open_dt=excluded.open_dt,
        metadata_observed_at=excluded.metadata_observed_at
      where public.movies.metadata_observed_at < excluded.metadata_observed_at;
  end loop;
  insert into public.box_office_periods(period_type,target_date,range_start,range_end,raw_response,row_count,fetched_at,expires_at)
    values(period_kind,target,(d->>'rangeStart')::date,(d->>'rangeEnd')::date,p_payload->'rawResponse',
      count_items,started,started + case when count_items=0 then interval '1 hour' else interval '24 hours' end)
    on conflict(period_type,target_date) do update set
      range_start=excluded.range_start,range_end=excluded.range_end,raw_response=excluded.raw_response,
      row_count=excluded.row_count,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,schema_version=1
    returning id into v_period_id;
  delete from public.box_office_entries e where e.period_id = v_period_id;
  for item in select x from jsonb_array_elements(items) x loop
    if exists (select 1 from unnest(array['rank','salesAmt','audiCnt','salesAcc','audiAcc']) f
      where coalesce(item->>f,'') !~ '^-?[0-9]+$' or abs((item->>f)::numeric) > 9007199254740991) then
      raise exception 'Invalid integer';
    end if;
    insert into public.box_office_entries(period_id,movie_cd,rank,sales_amt,audi_cnt,sales_acc,audi_acc)
      values(v_period_id,item->>'movieCd',(item->>'rank')::smallint,(item->>'salesAmt')::bigint,
        (item->>'audiCnt')::bigint,(item->>'salesAcc')::bigint,(item->>'audiAcc')::bigint);
  end loop;
  if (select count(*) from public.box_office_entries e where e.period_id = v_period_id) <> count_items then
    raise exception 'Row count mismatch';
  end if;
  return jsonb_build_object('saved', true);
end;
$$;
revoke all on function public.read_box_office_period(text,date) from public, anon, authenticated;
revoke all on function public.save_box_office_period(jsonb) from public, anon, authenticated;
grant execute on function public.read_box_office_period(text,date) to service_role;
grant execute on function public.save_box_office_period(jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
