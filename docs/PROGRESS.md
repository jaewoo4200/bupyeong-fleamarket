# 작업 기록 (PROGRESS)

> 최신 항목을 위에 추가. 타 에이전트/세션의 컨텍스트 유지용.

## 2026-06-30 (Codex) — 자리배치도 확대/가독성 개선 + 공용 확대 모달
- **범위**: 자리배치도 관련 UI만 수정. 추첨 규칙, 데이터 타입/스키마, 향제한/운영 로직은 변경하지 않음.
- **배포/리포 참고**: 현재 라이브 배포는 https://bupyeong-fleamarket.vercel.app/ 이고, GitHub 리포는 `jaewoo4200/bupyeong-fleamarket`(https://github.com/jaewoo4200/bupyeong-fleamarket).
- **공용 패널**: `components/venue/SeatMapPanel.tsx` 신설. `preview | standard | large` 크기 프리셋, caption, 카드 프레임, 가로 스크롤, `Maximize2` 크게 보기 버튼, 전체화면 모달(ESC/닫기 버튼/배경 클릭 닫기)을 한 곳에서 관리. 기존 `SeatMap` props(`states`, `seats`, `highlightCode`, `onSeatClick`, `onMapClick`, `lasso`, `onLasso`, `showOccupantNames`)는 그대로 전달.
- **적용 화면**: `VenueMapViewer`가 내부적으로 `SeatMapPanel`을 사용하도록 변경하고, `/admin`, `/board`, `/`, `/seller`, `/kiosk`, `SeatConfigMap`의 지도 렌더링을 공용 패널로 연결. `/admin`·`/board`는 지도 섹션 컨테이너를 `max-w-[1480px]`로 확장하고 `size="large"` 적용. 랜딩 히어로는 `preview`, 일반 랜딩/셀러/키오스크는 `standard`.
- **지도 자체 가독성**: `SeatMap` 좌석 번호/결합석 번호/랜드마크 라벨 폰트 상향, 좌석·하이라이트·랜드마크 stroke와 나무매대 바/벤치점 두께 상향. 기존 폭 추정과 `textLength` 압축 방식은 유지해서 긴 결합석 코드 잘림을 방지.
- **브라우저 확인**: 개발 서버 `http://localhost:3001`에서 실제 Chrome으로 `/board` 대형 지도 2개와 확대 버튼 렌더 확인, `/kiosk` 로그인→셀러 선택→추첨 결과 하이라이트 지도/확대 버튼 확인, `/admin` 현황/자리설정 지도 확인. 자리설정 확대 모달에서 좌석 76 클릭이 편집 패널 선택 상태(`76 윗구간`)로 반영되고 ESC 닫기 동작 확인. 검증 중 만든 데모 추첨 1건은 `추첨 초기화`로 0/40 상태 복구.
- **정적 검증**: `npm run typecheck` 통과. `npm test`는 샌드박스 IPC pipe 제한으로 1차 실패 후 정상 권한에서 16/16 통과. `npm run build`는 샌드박스 Turbopack 내부 포트 바인딩 제한으로 1차 실패 후 정상 권한에서 성공.
- **남은 검증 제약**: `npm run lint`는 이번 변경과 무관한 기존 파일 4곳(`AdminGate`, `BuskingPanel`, `StaffPanel`, `SeatRoulette`)의 `react-hooks/set-state-in-effect` 오류로 실패. Playwright 헤드리스는 Chrome Crashpad/권한 문제와 브라우저 캐시 미설치로 모바일·태블릿 자동 뷰포트 스크린샷까지는 완료하지 못함.

## 2026-06-30 (Codex context intake) — 전체 맥락 파악 + 후속 체크포인트
- **읽은 범위**: 루트 문서/설정(`CLAUDE.md`, `AGENTS.md`, `package.json`, env 예시), `docs/`, `app/`, `components/`, `lib/`, `tests/`, `supabase/`, `design-system/`, `_input/` 원본 자료(엑셀 시트 구조·주요 이미지·Claude Design handoff zip 텍스트)를 확인. `node_modules`, `.next`, `.git`, `.env.local` 같은 의존성/빌드/비밀값 파일은 전체 열람 대상에서 제외.
- **현재 이해**: 부평 문화의거리 플리마켓 자리 추첨 PoC. Next.js 16 App Router + React 19 + Tailwind v4. 데이터는 `Store` 인터페이스 아래 로컬(localStorage+BroadcastChannel) / Supabase(Postgres+Realtime+Auth) 자동 전환. 좌석 지도는 원본 엑셀에서 생성된 `lib/venue/venue-layout.ts` 상수와 `effectiveSeats(event)`가 중심.
- **운영 핵심**: `/admin`은 행사·명단·자리설정·버스킹·근무자·메모, `/kiosk`는 셀러 선택 후 추첨, `/seller`는 공개 자리 조회+현장 GPS, `/board`는 실시간 현황판. 2매대 셀러는 붙임석만, 일반 셀러는 단독석만 추첨.
- **문서/코드 불일치 후보**: 일부 문서/랜딩 카피에 제거된 “향제한” 설명이 남아 있음. `docs/FEATURE6_GPS.md`와 진행 기록 일부는 좌석 목표 GPS처럼 읽히지만 현재 `GpsGuide`는 행사장 중심까지의 거리/방위 + 배치도 폴백 구현. `docs/ARCHITECTURE.md`의 Supabase 체크리스트는 이미 구현된 내용 일부를 후속처럼 표현.
- **후속 주의점**: Supabase 모드에서 `setBuskingEntries`/`setStaffEntries`는 전체 delete→insert라 저장 실패 처리 유지 필요. 버스킹 “무대 앞 6석 제외” 버튼은 현재 `setSeatActive`를 6회 호출하므로, Supabase 쓰기 비용/깜빡임 개선 시 `setSeatsActive`로 바꾸기 좋음. `supabase/migrations/0001_init.sql`의 realtime add는 재실행 멱등성이 약하므로 재적용 가이드나 SQL 보강 후보.

## 2026-06-30 (12) — 나무매대 표시 + 일정 월별 보기 + 배치도 아랫구간 바깥 strip 제거
- **나무매대 표시**: 배정 좌석이 `event.woodSeatCodes`(=`states[code].type==="wood"`)면 셀러 ‘내 자리’ 카드 + 키오스크 추첨 결과에 **🪵 나무매대** 배지. (운영자가 ‘자리 설정’에서 지정한 좌석만)
- **버스킹/근무자 월별 보기**: 공용 `components/admin/MonthBar.tsx`(◀▶·월선택·전체 보기 토글). 패널 목록을 선택 월로 필터(빈 달 안내), 신규 항목 기본 날짜·붙여넣기 M/D 보정도 선택 월 기준. 기존 나열식 → 월 단위 조회.
- **배치도 아랫구간 바깥 strip 완전 제거(요청: 아예 안뜨게)**: `lib/venue/bounds.ts`에서 **좌석 세로 범위와 겹치는 랜드마크만** 렌더(`VISIBLE_LANDMARKS`)하고 bounds도 거기에 맞춤 → 아랫구간 맨 아래 상가·포장마차·문화의거리입구·조형물 + 빈 여백 제거(첨부 우측 이미지와 일치). 좌석 사이 운영 구조물(중앙무대·분수대·배전반 등)은 유지. 모든 상가(store)는 좌석 줄 밖이라 자동 제외 → 이전 ‘주변 상가’ 토글 제거.
- 검증: typecheck·build·test(16/16). 로컬 프리뷰 — 아랫구간 크롭(우측 이미지 일치)·월 네비(6월 10건↔4월 0건)·나무매대 배지(seat30 June=O / seat48 July=X) 확인, 콘솔 에러 0.

## 2026-06-30 (11) — 일정 텍스트 가져오기(버스킹·근무자 탭) + 지도 확대·접기
- **버스킹/근무자 = 편집 가능한 전역 데이터로 전환**: `AppData.busking/staff`(날짜 기준), `Store.setBuskingEntries/setStaffEntries`(양 어댑터). 기존 정적 파일(`lib/data/busking.ts`·`staff.ts`)은 시드 배열(`SEED_BUSKING`/`SEED_STAFF`)+순수 셀렉터(`*ForDate(entries,date)`)로 리팩터. 마이그레이션 `0004_schedules.sql`(busking/staff 테이블 + 읽기public/쓰기auth RLS + realtime + 데모 시드). load는 테이블 없으면 복원력 유지.
- **사진→텍스트 자동입력(우리쪽은 텍스트만 처리, OCR/AI 호출 없음)**: `lib/data/schedule-parse.ts` — 복붙용 프롬프트(`BUSKING_PROMPT`/`STAFF_PROMPT`)를 운영자가 자기 AI에 사진과 함께 넣어 구조화 텍스트를 받고, 그걸 붙여넣으면 `parseBuskingText`/`parseStaffText`가 파싱(`날짜|…` 형식, `normalizeDate` 관대, issue 리포트, `upsertByDate` 날짜별 병합).
- **관리자 버스킹·근무자 탭 분리**(`components/admin/{SchedulePromptBox,BuskingPanel,StaffPanel}.tsx`): 프롬프트 복사 → 붙여넣기 미리보기(인식 건수·오류 줄) → 가져오기 → 인라인 편집(추가/삭제, 날짜별 그룹) → 일괄 **저장/되돌리기**(키 입력마다 저장 안 함 = Supabase 부하↓).
- **지도**: 현황 자리표 **풀폭 확대**, 좌석 폰트 상향. **글자 잘림 제거** — 한글 폭 추정으로 박스에 맞춰 폰트 산정 + `textLength`/`lengthAdjust` 압축 + `<title>` 호버. **주변 상가(store, 벤치·번호 없음) 접기 토글**(`SeatMap.hideStores`, 기본 숨김; `bounds` 타이트; `VenueMapViewer` 토글).
- 검증: typecheck·build·test(**16/16**, schedule-parse 테스트). 로컬 프리뷰 E2E — 버스킹/근무자 붙여넣기→미리보기→가져오기(날짜 병합, 중복 없음)→저장→localStorage 영속, 6/7 행사 현황에 버스킹 알림+오늘근무(가져온 6/7 근무자) 반영, 상가 토글·라벨 비잘림 확인(모바일 포함).
- **적대적 코드리뷰(멀티 에이전트) 후 확정 결함 6건 수정**: ① 근무자 `|` 구분도 분리(쉼표 외) ② `normalizeDate` 요일 접미사 `(토)`/` 토` 일관 제거 + 실제 달력 검증(2/30·6/31 거부) ③ Supabase `setBusking/StaffEntries` delete→insert 오류 캡처·throw(빈 목록 덮어쓰기 방지) ④ 패널 `save` await화(저장 깜빡임/초안 유실 방지, 실패 시 alert+dirty 유지) ⑤ 결합석 코드(`24,24-1` 등) 폰트 폭 보정+`textLength`로 박스 내 정렬(브라우저 bbox로 6종 모두 fit 확인) ⑥ `0004` 멱등화(정책 drop-if-exists, realtime add 조건부)→재실행 안전.
- ⚠️ 사용자: Supabase에 **`0004_schedules.sql` 실행** 필요(미적용 시 버스킹/근무자만 빈 상태, 크래시 없음). push는 기존 보안 롤아웃 순서와 함께(아래 (10) 참고).

## 2026-06-30 (10) — 운영 보안 하드닝 + 기능 6-B(GPS)
- **Supabase Auth 로그인**: Supabase 모드일 때 `AdminGate`가 이메일/비번 로그인(`signInWithPassword`), client `persistSession`, 로그아웃 signOut. 로컬 모드는 기존 비번 게이트 유지. autoSeed는 세션 있을 때만.
- **제한 RLS `0003_secure_rls.sql`**: 공개 읽기 / 인증 쓰기, `claim_seat`는 authenticated만. ⚠️ 적용 순서: 관리자 계정 생성→배포→0003.
- **기능 6-B GPS 길안내**(`components/venue/GpsGuide.tsx`, Kakao 키 불필요): 셀러 내자리 화면에서 위치 권한→행사장까지 거리·방위, 나침반 화살표(DeviceOrientation), 배치도 좌석 강조. 미지원/거부 시 배치도+문구 폴백.
- 검증: typecheck·build·test(6/6). 로컬 GPS 버튼 렌더, Supabase 모드 Auth 로그인 UI 렌더 확인. (실제 로그인/GPS 값은 계정·기기 필요)
- ⚠️ **아직 push 안 함**: 관리자 계정 생성 후 push(라이브 /admin이 Auth 로그인으로 전환)→0003 실행 순서.

## 2026-06-30 (9) — 일괄 제외 UI · 큰 라벨 · 2매대 매칭
- **일괄 추첨 제외**: `자리 설정 → 일괄 제외(드래그)`. SeatMap 포인터 드래그 lasso(터치/마우스) + 빠른 칩(57~80·45~80·윗/아랫구간·전체 초기화). `Store.setSeatsActive` 일괄 op(양 어댑터).
- **배치도 라벨 확대**: 매장명 상한 9→16(폭 맞춤), 좌석 셀 상호명 글자 확대.
- **2매대(붙임석) 매칭**: `Seller.twoTables`(엑셀 '매대 2개' 자동인식 + 명단 토글). 추첨 규칙 — 2매대 셀러→붙임석만, 일반 셀러→단독석만(`filterByTwoTables`). 붙임석은 두 번호 묶여 한 번에 배정(기존). 마이그레이션 `0002_two_tables.sql`.
- 검증: typecheck·build·test(6/6). 로컬에서 lasso/프리셋 제외, 2매대 셀러→`38,38-1`·일반→`58` 확인.
- ⚠️ 사용자: Supabase에 **0002_two_tables.sql 실행** 후 push→redeploy.

## 2026-06-29 (8) — Supabase 어댑터 연결 (env 스위치)
- 공용 `Store` 인터페이스(`lib/data/types.ts`) + `getStore()` env 스위치: `NEXT_PUBLIC_SUPABASE_*` 있으면 `SupabaseStore`, 없으면 로컬.
- `lib/data/supabase-store.ts`: 인메모리 미러 + Realtime 구독(events/sellers/draws/notes) + `claim_seat` RPC 추첨 + 빈 DB 자동 시드 + load 복원력(마이그레이션 미적용 시 빈 상태).
- 마이그레이션을 **현재 모델**로 재작성(`supabase/migrations/0001_init.sql`): events(text[]·jsonb), sellers/draws/notes, `claim_seat`, PoC용 공개 RLS, Realtime. (좌석 좌표는 앱 상수라 DB 미저장)
- 공용 seed/util을 `lib/data/seed.ts`로 추출, `drawSeat` async화(키오스크 await).
- 검증: typecheck·build·test(6/6) 통과, **로컬 어댑터 추첨 회귀 OK**. Supabase 런타임 검증은 사용자가 마이그레이션 적용 후 진행.
- GitHub 푸시 완료(noreply 이메일로 커밋 재작성). 배포 가이드 `docs/DEPLOY.md`.

### 배포 완료 (2026-06-29)
- 라이브: https://bupyeong-fleamarket.vercel.app · GitHub 푸시 + Vercel env(3키+ADMIN) Redeploy 완료.
- 마이그레이션 적용 확인: events 2 / sellers 80 / notes 2 (앱 자동 시드 = anon 쓰기 성공), 사이트 200, `claim_seat` RPC 정상.

### 다음
- [ ] 사람 확인: 라이브에서 두 기기(/kiosk ↔ /board)로 추첨→실시간 반영 체감.
- [ ] (운영) Supabase Auth + 제한 RLS로 교체(현재 PoC 공개 RLS). 기능 6-B(지도 길안내).

## 2026-06-29 (7) — Claude Design 핸드오프 반영 (AA 리디자인)
- 핸드오프 zip(`_input/...handoff.zip`)의 `부평 플리마켓 디자인 시스템.dc.html` 적용.
- **토큰**(`app/globals.css`): coral-600/700 AA(#cb4618/#a93512), teal-700, rose-600, radius(xl18/2xl24), 섀도 정제,
  시맨틱 토큰(`--action/--accent-action/--danger/--text*/--focus-ring`) + 벤치 토큰.
- **카테고리 14색**(`categories.ts`) AA 팔레트로 교체, **벤치색**(`bench.ts`) red #e5392b / blue #1683c9 (+틴트).
- **컴포넌트**: 버튼(action 색·터치 ≥44px·radius12·focus-ring), 배지 텍스트 AA 심화, 카드 radius24, 인풋 44px·focus-ring.
  코랄 텍스트/포인트 accent를 coral-600으로 상향(AA).
- **배치도**: 좌석 번호 +30%, 벤치점 흰 링 강화. **추첨 결과**: 🎉 헤더 + N번 셀러 + 흰 티켓(번호 분리) + 카테고리 칩.
- 검증: typecheck·build(무경고)·test(6/6) 통과. Preview로 랜딩·키오스크 reveal·배치도 확인.

## 2026-06-29 (6) — 디자인 킷 export (Claude Design 핸드오프)
- 이 환경은 Claude Design 자동 푸시 권한 부여 불가(`/design-login` 대화형 터미널 필요). 대신 **로컬 디자인 킷 번들** 생성.
- `design-system/`: foundations(colors·typography·elevation) + components(buttons·badges·cards·inputs·logo·legend·seat-states·seat-map·draw-reveal) HTML 카드(`@dsCard`), 토큰 인라인·단독 렌더. assets에 로고 복사.
- 검증: public 임시 복사로 colors·seat-map·logo 렌더 확인 후 정리. `design-system/README.md`에 Claude Design 가져오기 절차 기재.
- 다음: 권한 부여(터미널 `/design-login`) 후 `/design-sync`로 푸시하거나 Claude Design에 업로드 → 개선된 토큰을 `app/globals.css`·`components/*`에 역반영.

## 2026-06-29 (5) — 공식 로고 추가 (주최/운영)
- `_input`의 `문화의거리_로고.png`(투명배경)·`위브라더스_로고.png`(네이비배경)를 `public/logos/`에 복사(문화의거리는 알파 bbox 트림).
- `components/brand/PartnerLogos.tsx` 신설: 주최(부평 문화의거리)·운영(위브라더스) 로고. 위브라더스는 라운드 배지로 표시.
- 푸터에 PartnerLogos 노출, 랜딩 히어로 상단에 문화의거리 공식 로고(`next/image`, `self-start`로 종횡비 유지).
- **헤더 로고**: 로고에서 아이콘(쇼핑백+하트)만 마스크 추출(`public/logos/cultural-street-icon.png`) → `components/brand/Logo.tsx`의 `LogoMark`가 이 아이콘 사용(전 페이지 헤더/푸터 적용).
- 검증: typecheck·build(무경고)·test(6/6) 통과, 헤더/히어로/푸터 렌더 확인.

## 2026-06-29 (4) — 현장 메모 기능
- `Note` 타입 + `AppData.notes`. 행사별 메모(셀러 요청·시설 이슈). store: `addNote/toggleNote/removeNote`.
- 관리자 **메모 탭**(`components/admin/NotesPanel.tsx`): 태그(의자/테이블/시설/기타)·빠른 입력 프리셋·완료 체크·삭제, 미처리 수 탭 배지.
- 시드에 예시 메모 2건. 구버전 localStorage 호환(`notes ??= []`).
- 검증: typecheck·build·test 통과, 추가/완료/삭제 동작 확인.

## 2026-06-29 (3) — 추첨 전 세팅 강화 + 버스킹/근무표 + 향제한 제거
- **향제한 기능 전면 제거** (미사용): pickSeat/EventConfig/Seller/Legend/Roster/Kiosk/SeatConfig에서 삭제. 추첨은 단순 무작위.
- **좌석 비활성화(추첨 제외)**: 자리설정 탭에서 좌석 탭→"추첨에서 제외". `activeSeatCodes`가 제외 반영.
- **2매대(결합석) 분리/붙임**: `EventConfig.splitSeatCodes`. 결합석(`8, 8-1` 등 6개)을 당일 단독 2석으로 분리/붙임.
  `lib/venue/seats.ts`(`effectiveSeats`)가 분리·커스텀 좌석을 반영 → 지도/추첨 풀/배정 드롭다운 전부 일관.
- **임의 좌석 추가**: `EventConfig.customSeats`. 자리설정 "좌석 추가" 모드에서 지도 탭 → 좌석 생성/삭제(`SeatMap.onMapClick`).
- **버스킹 일정 알림**: `lib/data/busking.ts`(6월 데모). 행사일에 공연 있으면 관리자 현황에 알림 + "무대 앞 6석(27~29·57~59) 제외" 버튼.
- **근무표**: `lib/data/staff.ts`(7월 데모). 행사일 근무자를 현황에 표시.
- **시드 2건**: 7/4(토, 근무표 데모) + 6/7(일, 버스킹 데모). 행사 선택으로 전환.
- `SeatMap`에 `seats`(동적 좌석목록)·`onMapClick` prop 추가. 모든 화면이 `effectiveSeats(event)` 전달.
- 검증: typecheck·build·test(6/6) 통과. Preview로 버스킹 알림/근무자/분리/커스텀 추가/제외 동작 확인.

## 2026-06-29 (2) — 피드백 반영: 벤치 유무 + 라벨 + 추첨 접근
- **벤치(의자) 유무**: 엑셀 좌석 박스 배경색(빨강 FFFF0000 40석 / 파랑 FF00B0F0 40석) 추출 → `SeatGeo.palette`.
  운영팀 확인: **빨강=벤치 있음, 파랑=의자 지급 필요** (`lib/venue/bench.ts` `BENCH_COLOR='red'`).
  지도: 빈 좌석 연한 틴트 + 좌하단 색점, 범례 항목 추가, 관리자 현황에 "의자 지급 필요 N석"(파랑 사용좌석) 집계.
- **배치도 매장 라벨 글자 크게**(`SeatMap` 랜드마크 fontSize 상향, 가로 라벨 최대 9, 폭 기반 클램프).
- **추첨 화면 접근**: 관리자 현황 탭에 "추첨 화면 열기"(→`/kiosk`) 버튼 추가.
- 검증: typecheck·build 통과, 보드 범례/관리자 카운트 확인.

## 2026-06-29 — PoC 1차 완성 (기능 1~5 + 6-A)
- 스캐폴드: Next.js 16 + TS + Tailwind v4 + Pretendard + Framer Motion + lucide + SheetJS.
- 디자인 시스템: `app/globals.css`(@theme 토큰), `components/ui/*`, 로고(`components/brand/Logo`).
- 배치도: `_input` 엑셀 좌표 추출 → `lib/venue/venue-layout.ts`(SEATS 80, LANDMARKS 84).
  - x축 ×5.25 비율 보정으로 정사각 좌석/가로형 band 확보. 좌석 코드 유니크화(서브좌석 포함).
  - `SeatMap`(SVG) + `VenueMapViewer`(전체/윗/아랫 탭, 전체 시 2 band 스택) + `Legend`.
- 데이터 레이어: `lib/data/{types,store,hooks,selectors}` — 로컬 어댑터(localStorage + BroadcastChannel 실시간),
  `useSyncExternalStore` 훅. 시드 = 샘플 명단 40명/토 플리마켓.
- 엑셀 파싱: `lib/excel/parseSellers`(헤더 자동탐지, 번호/상호/이름/취급상품/전화).
- 추첨: `lib/lottery/rules`(향제한 금4-11/토일8-11, 무작위), `/kiosk`(룰렛 → 좌석 공개 → 지도 하이라이트).
- 화면: `/`(랜딩) `/seller`(검색·내자리·길안내) `/board`(현황판) `/kiosk` `/admin`(현황/명단/자리설정/행사).
- 수동 수정: 재배정/교환/취소, 좌석 비활성·나무매대 지정, 향제한 토글, CSV 내보내기, 추첨 초기화.
- 기능 6-A: `lib/venue/directions`(랜드마크 텍스트 안내). 6-B 설계 문서화([FEATURE6_GPS](./FEATURE6_GPS.md)).
- 운영 전환용 Supabase 마이그레이션/시드 작성(`supabase/` 0001_init.sql + seed.sql, draw_seat RPC + RLS).
- 단위 테스트(`tests/`, `npm test` = tsx --test): pickSeat 향제한 2000회·풀소진·일반, defaultScentExcludedSeats,
  categorize, 실제 `_input` 엑셀 파싱 → **7/7 통과**.
- 검증: `npm run typecheck`·`npm run build`(전 라우트 static prerender)·`npm test` 통과.
  Preview로 랜딩·배치도·키오스크 추첨(34,34-1 배정)·관리자(현황/명단/자리설정/행사)·셀러 검색+길안내 확인.

### 알려진 보완점 / TODO
- [ ] Supabase 어댑터 실제 연결(키 수령 후) + Auth + RLS + Realtime.
- [ ] 기능 6-B: Kakao 지도 + 현재위치 + 나침반 (현장 기준점 위경도 실측 필요).
- [ ] 전화번호 컬럼 도입 시 검색 노출.
- [ ] 비비데이 전용 배치(77-1/78-1, 토·일 한정 좌석) 별도 구성 반영(엑셀 sheet2 참고).
