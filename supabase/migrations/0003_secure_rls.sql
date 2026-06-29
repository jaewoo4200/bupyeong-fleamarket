-- 운영 보안 하드닝: 공개 읽기 / 로그인(authenticated) 쓰기
-- ⚠️ 적용 순서: ① Supabase Auth에 관리자 계정 생성 → ② 새 코드 배포(로그인 동작 확인) → ③ 이 SQL 실행.
--    (먼저 실행하면 로그인 전엔 쓰기가 막힙니다. 읽기/조회는 계속 공개.)

-- PoC 공개 정책 제거
drop policy if exists "poc all events"  on events;
drop policy if exists "poc all sellers" on sellers;
drop policy if exists "poc all draws"   on draws;
drop policy if exists "poc all notes"   on notes;

-- 읽기: 누구나 (셀러 조회 / 현황판 공개)
create policy "read events"  on events  for select using (true);
create policy "read sellers" on sellers for select using (true);
create policy "read draws"   on draws   for select using (true);
create policy "read notes"   on notes   for select using (true);

-- 쓰기(INSERT/UPDATE/DELETE): 로그인한 운영자만
create policy "write events"  on events  for all to authenticated using (true) with check (true);
create policy "write sellers" on sellers for all to authenticated using (true) with check (true);
create policy "write draws"   on draws   for all to authenticated using (true) with check (true);
create policy "write notes"   on notes   for all to authenticated using (true) with check (true);

-- 추첨 RPC: 로그인한 운영자만 실행
revoke execute on function claim_seat(uuid, uuid, text) from anon, public;
grant  execute on function claim_seat(uuid, uuid, text) to authenticated;
