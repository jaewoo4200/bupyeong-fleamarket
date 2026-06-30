-- 버스킹/근무자 일정 — 전역(날짜 기준) 테이블. 관리자 페이지에서 텍스트 붙여넣기로 가져오기/편집.
-- 적용: Supabase 대시보드 → SQL Editor → 전체 붙여넣고 Run. (0001~0003 이후 실행)
-- 읽기=public, 쓰기=authenticated (0003과 동일한 운영 보안 정책).

create extension if not exists pgcrypto;

create table if not exists busking (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  time       text,
  title      text not null default '',
  performer  text,
  contact    text,
  created_at timestamptz not null default now()
);
create index if not exists busking_date_idx on busking(date);

create table if not exists staff (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  name       text not null default '',
  role       text,
  created_at timestamptz not null default now()
);
create index if not exists staff_date_idx on staff(date);

-- ── RLS: 읽기 public / 쓰기 authenticated ─────────────────────
-- (drop if exists → 재실행해도 "policy already exists" 오류 없이 멱등)
alter table busking enable row level security;
alter table staff   enable row level security;

drop policy if exists "read busking"  on busking;
drop policy if exists "read staff"    on staff;
drop policy if exists "write busking" on busking;
drop policy if exists "write staff"   on staff;

create policy "read busking"  on busking for select using (true);
create policy "read staff"    on staff   for select using (true);
create policy "write busking" on busking for all to authenticated using (true) with check (true);
create policy "write staff"   on staff   for all to authenticated using (true) with check (true);

-- ── Realtime (이미 추가돼 있으면 건너뜀 → 재실행 멱등) ──────────
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'busking') then
    alter publication supabase_realtime add table busking;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'staff') then
    alter publication supabase_realtime add table staff;
  end if;
end $$;

-- ── 데모 시드(최초 1회만 — 이미 데이터가 있으면 건너뜀) ────────
insert into busking (date, time, title, performer, contact)
select * from (values
  ('2026-06-03'::date,'18:00~20:00','뮤지컬 공연','여성환','010-9846-2476'),
  ('2026-06-05'::date,'16:00~18:00','성악+보컬+힙합 (3명)','양준성','010-3477-9386'),
  ('2026-06-06'::date,'17:00~18:00','남녀 혼성 듀엣','김정태 (여운)','010-4031-7328'),
  ('2026-06-07'::date,'17:30~19:30','보컬그룹 (3인) · 발라드','민재봉','010-2418-9497'),
  ('2026-06-14'::date,'17:00~19:00','발라드 보컬 (4~5명)','림보 (임미현)','010-4782-9665'),
  ('2026-06-15'::date,'13:00~13:30','해군 군악대 행사',null,null),
  ('2026-06-20'::date,'18:00~19:00','통기타 라이브','김도영','010-8626-2667'),
  ('2026-06-26'::date,'15:00~17:00','공연 (통기타+하모니카)','부평구 평생학습관','032-509-6435'),
  ('2026-06-27'::date,'18:00~','무대: 부평구르네상스센터',null,null),
  ('2026-06-27'::date,'20:00~21:00','평식당: 보컬그룹(3인) 발라드','민재봉','010-2418-9497')
) as v(date,time,title,performer,contact)
where not exists (select 1 from busking);

insert into staff (date, name, role)
select * from (values
  ('2026-07-03'::date,'안재훈','부장'),('2026-07-03'::date,'신철용','대리'),('2026-07-03'::date,'송원규','사원'),
  ('2026-07-04'::date,'총무님',null),('2026-07-04'::date,'이재원',null),('2026-07-04'::date,'서제우',null),
  ('2026-07-05'::date,'총무님',null),('2026-07-05'::date,'이재우',null),('2026-07-05'::date,'선남이',null),
  ('2026-07-10'::date,'배태욱','대리'),('2026-07-10'::date,'선남이',null),('2026-07-10'::date,'백유빈',null),
  ('2026-07-11'::date,'총무님',null),('2026-07-11'::date,'임상민',null),('2026-07-11'::date,'서제우',null),
  ('2026-07-12'::date,'총무님',null),('2026-07-12'::date,'이재우',null),('2026-07-12'::date,'김태섭',null),
  ('2026-07-17'::date,'안재훈','부장'),('2026-07-17'::date,'신철용','대리'),('2026-07-17'::date,'송원규','사원'),
  ('2026-07-18'::date,'총무님',null),('2026-07-18'::date,'임상민',null),('2026-07-18'::date,'김태섭',null),
  ('2026-07-19'::date,'총무님',null),('2026-07-19'::date,'이재우',null),('2026-07-19'::date,'백유빈',null),
  ('2026-07-24'::date,'안재훈','부장'),('2026-07-24'::date,'신철용','대리'),('2026-07-24'::date,'송원규','사원'),
  ('2026-07-25'::date,'총무님',null),('2026-07-25'::date,'임상민',null),('2026-07-25'::date,'선남이',null),
  ('2026-07-26'::date,'총무님',null),('2026-07-26'::date,'이재원',null),('2026-07-26'::date,'백유빈',null),
  ('2026-07-31'::date,'안재훈','부장'),('2026-07-31'::date,'신철용','대리'),('2026-07-31'::date,'송원규','사원')
) as v(date,name,role)
where not exists (select 1 from staff);
