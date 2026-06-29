-- 2매대(붙임석) 사용 셀러 플래그 추가
-- 적용: Supabase SQL Editor에 붙여넣고 Run. (0001 적용된 프로젝트에 증분 적용)
alter table sellers add column if not exists two_tables boolean not null default false;
