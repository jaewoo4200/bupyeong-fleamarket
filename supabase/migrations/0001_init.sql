-- 부평 플리마켓 — Supabase 스키마 (현재 데이터 모델)
-- 적용: Supabase 대시보드 → SQL Editor → 전체 붙여넣고 Run.
-- 좌석 후보 계산(결합석 분리·커스텀 좌석·비활성)은 클라이언트(lib/venue/seats.ts effectiveSeats)에서 하고,
-- 서버는 claim_seat RPC로 "이미 점유된 좌석" 충돌만 원자적으로 차단한다.

create extension if not exists pgcrypto;

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
  wood_seat_codes     text[] not null default '{}',
  inactive_seat_codes text[] not null default '{}',
  split_seat_codes    text[] not null default '{}',
  custom_seats        jsonb  not null default '[]',
  created_at    timestamptz not null default now()
);

create table if not exists sellers (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  seq           int not null,
  business      text not null default '',
  name          text not null default '',
  product_text  text not null default '',
  category_key  text not null default 'etc',
  phone         text,
  assigned_seat text,
  drawn_at      timestamptz
);
create index if not exists sellers_event_idx on sellers(event_id);

create table if not exists draws (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  seller_id   uuid,
  seller_name text not null default '',
  seat_code   text,
  at          timestamptz not null default now(),
  action      text not null check (action in ('draw','reassign','swap','deactivate','reset')),
  note        text
);
create index if not exists draws_event_idx on draws(event_id);

create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  text       text not null,
  tag        text,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notes_event_idx on notes(event_id);

-- ── 원자적 좌석 점유 (중복 방지) ──────────────────────────────
create or replace function claim_seat(p_event uuid, p_seller uuid, p_seat text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned text;
  v_name     text;
  v_taken    int;
begin
  select assigned_seat, business || ' (' || name || ')'
    into v_assigned, v_name
    from sellers where id = p_seller and event_id = p_event
    for update;
  if not found then raise exception 'seller not found'; end if;
  if v_assigned is not null then return 'ALREADY'; end if;

  select count(*) into v_taken
    from sellers where event_id = p_event and assigned_seat = p_seat;
  if v_taken > 0 then return 'TAKEN'; end if;

  update sellers set assigned_seat = p_seat, drawn_at = now() where id = p_seller;
  insert into draws(event_id, seller_id, seller_name, seat_code, action)
    values (p_event, p_seller, v_name, p_seat, 'draw');
  return 'OK';
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────
-- PoC: 비밀번호 게이트(클라이언트)만 사용하므로 anon 읽기/쓰기를 허용한다.
-- 운영 전환 시 Supabase Auth + 제한 정책(읽기=public, 쓰기=authenticated)으로 교체할 것.
alter table events  enable row level security;
alter table sellers enable row level security;
alter table draws   enable row level security;
alter table notes   enable row level security;

create policy "poc all events"  on events  for all using (true) with check (true);
create policy "poc all sellers" on sellers for all using (true) with check (true);
create policy "poc all draws"   on draws   for all using (true) with check (true);
create policy "poc all notes"   on notes   for all using (true) with check (true);

-- ── Realtime (현황 실시간 반영) ───────────────────────────────
alter publication supabase_realtime add table events, sellers, draws, notes;
