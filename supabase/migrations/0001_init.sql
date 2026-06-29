-- 부평 플리마켓 — 운영 전환용 스키마 (Supabase / Postgres)
-- 적용:  supabase db push   또는  psql < 이 파일
-- 좌석 카탈로그 시드는 supabase/seed.sql 참고.

create extension if not exists "pgcrypto";

-- 정적 좌석 카탈로그 (배치도 좌표; lib/venue/venue-layout.ts와 동일)
create table if not exists seat_catalog (
  seat_code     text primary key,
  label         text not null,
  num           int  not null,
  x numeric not null, y numeric not null, w numeric not null, h numeric not null,
  band          int  not null check (band in (1,2)),
  wood_capable  boolean not null default false
);

-- 행사 (하루치 설정)
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  weekday       text not null check (weekday in ('금','토','일')),
  event_type    text not null default 'fleamarket' check (event_type in ('fleamarket','bbday')),
  name          text not null,
  status        text not null default 'draft'
                  check (status in ('draft','lottery_open','lottery_closed','completed')),
  count_wood    int not null default 0,
  count_table   int not null default 80,
  count_chair   int not null default 80,
  scent_excluded_seats int[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- 행사별 좌석 상태
create table if not exists event_seats (
  event_id           uuid not null references events(id) on delete cascade,
  seat_code          text not null references seat_catalog(seat_code),
  active             boolean not null default true,
  seat_type          text not null default 'table' check (seat_type in ('table','wood')),
  assigned_seller_id uuid,
  primary key (event_id, seat_code)
);

-- 참가자(셀러)
create table if not exists sellers (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  seq           int not null,
  business      text not null default '',
  name          text not null default '',
  product_text  text not null default '',
  category_key  text not null default 'etc',
  is_scented    boolean not null default false,
  phone         text,
  assigned_seat text references seat_catalog(seat_code),
  drawn_at      timestamptz
);
create index if not exists sellers_event_idx on sellers(event_id);

-- 추첨/수정 감사 로그
create table if not exists draws (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  seller_id   uuid,
  seller_name text not null default '',
  seat_code   text,
  at          timestamptz not null default now(),
  action      text not null check (action in ('draw','redraw','reassign','swap','deactivate','reset')),
  note        text
);

-- 관리자 프로필 (Supabase Auth 확장)
create table if not exists admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null default 'admin'
);

-- ─────────────────────────────────────────────────────────────
-- 원자적 좌석 추첨 RPC (향제한 + 중복 방지)
-- ─────────────────────────────────────────────────────────────
create or replace function draw_seat(p_event uuid, p_seller uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scented  boolean;
  v_assigned text;
  v_excluded int[];
  v_seat     text;
  v_name     text;
begin
  select is_scented, assigned_seat, business || ' (' || name || ')'
    into v_scented, v_assigned, v_name
    from sellers where id = p_seller and event_id = p_event
    for update;
  if not found then raise exception '셀러를 찾을 수 없습니다.'; end if;
  if v_assigned is not null then raise exception '이미 자리가 배정된 셀러입니다.'; end if;

  select scent_excluded_seats into v_excluded from events where id = p_event;

  -- 남은 활성 좌석 중 (향제한 셀러면 제외 좌석 빼고) 무작위 1석을 잠금 확보
  select es.seat_code into v_seat
    from event_seats es
    join seat_catalog sc on sc.seat_code = es.seat_code
   where es.event_id = p_event
     and es.active
     and es.assigned_seller_id is null
     and (not coalesce(v_scented,false) or not (sc.num = any(v_excluded)))
   order by random()
   limit 1
   for update skip locked;

  if v_seat is null then raise exception '배정 가능한 좌석이 없습니다.'; end if;

  update event_seats set assigned_seller_id = p_seller
    where event_id = p_event and seat_code = v_seat;
  update sellers set assigned_seat = v_seat, drawn_at = now() where id = p_seller;
  insert into draws(event_id, seller_id, seller_name, seat_code, action)
    values (p_event, p_seller, v_name, v_seat, 'draw');

  return v_seat;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS — 공개 조회 / 관리자 쓰기
-- ─────────────────────────────────────────────────────────────
alter table seat_catalog enable row level security;
alter table events       enable row level security;
alter table event_seats  enable row level security;
alter table sellers      enable row level security;
alter table draws        enable row level security;

create policy "public read seat_catalog" on seat_catalog for select using (true);
create policy "public read events"       on events       for select using (true);
create policy "public read event_seats"  on event_seats  for select using (true);
create policy "public read sellers"      on sellers      for select using (true);
create policy "public read draws"        on draws        for select using (true);

-- 관리자(로그인 사용자)만 쓰기. 필요 시 admin_profiles 존재 여부로 더 좁힐 수 있음.
create policy "admin write events"      on events      for all to authenticated using (true) with check (true);
create policy "admin write event_seats" on event_seats for all to authenticated using (true) with check (true);
create policy "admin write sellers"     on sellers     for all to authenticated using (true) with check (true);
create policy "admin write draws"       on draws       for all to authenticated using (true) with check (true);

-- Realtime 발행 (현황 실시간 반영)
alter publication supabase_realtime add table sellers, event_seats, draws, events;
