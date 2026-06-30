# CLAUDE.md

부평 문화의거리 플리마켓 **자리 추첨 웹앱**. 종이 번호표 추첨을 디지털화(자리배치도 + 터치 추첨 + 실시간 공유).

## 먼저 읽기
- **[docs/PROJECT.md](docs/PROJECT.md)** — 개요·상태·실행·라우트 (단일 진입점)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DATA_MODEL.md](docs/DATA_MODEL.md) · [docs/DECISIONS.md](docs/DECISIONS.md) · [docs/PROGRESS.md](docs/PROGRESS.md) · [docs/FEATURE6_GPS.md](docs/FEATURE6_GPS.md)

## 스택 / 실행
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (@theme) · Framer Motion · SheetJS.
```
npm run dev        # http://localhost:3000  (.claude/launch.json: "dev")
npm run typecheck
npm run build
```
관리자 비밀번호(PoC): `bupyeong` (`NEXT_PUBLIC_ADMIN_PASSWORD`).

## 핵심 규칙
- 데이터는 **어댑터 자동 전환**(`getStore()`): `NEXT_PUBLIC_SUPABASE_*` env 있으면 `SupabaseStore`(`lib/data/supabase-store.ts`, Postgres+Realtime), 없으면 로컬(`lib/data/store.ts`, localStorage+BroadcastChannel). 공용 인터페이스 `Store`(`lib/data/types.ts`), 공용 시드/유틸 `lib/data/seed.ts`.
  화면은 `lib/data/hooks.ts`(useSyncExternalStore)로 구독 — 변경 시 실시간 반영. 추첨은 `drawSeat`(async); Supabase는 `claim_seat` RPC로 원자적 점유.
- 배치도 좌표는 **자동 생성** `lib/venue/venue-layout.ts` (원본 `_input/` 엑셀에서 추출, x축 ×5.25 보정). 직접 수정 금지.
- 추첨 로직 `lib/lottery/rules.ts`(단순 무작위), 좌석 상태/검색 `lib/data/selectors.ts`, 좌석 변형 `lib/venue/seats.ts`(순수).
- 좌석 `code`는 엑셀 라벨(유니크, 서브좌석 `8, 8-1` 등). `palette`(빨강=벤치/파랑=의자지급)는 `lib/venue/bench.ts`.
- **유효 좌석**은 항상 `effectiveSeats(event)` 사용: 결합석 분리(`splitSeatCodes`)·임의 좌석(`customSeats`)·비활성(`inactiveSeatCodes`) 반영. 일괄 제외는 `setSeatsActive`.
- **2매대 매칭**(`filterByTwoTables`): `seller.twoTables`면 붙임석(결합석, 코드에 `,`)만, 아니면 단독석만 추첨. `twoTables`는 엑셀 '매대 2개' 자동인식 + 명단 토글.
- **현장 명단 편집**: `Store.addSeller/updateSeller/removeSeller`(양 어댑터, `updateSeller`는 `productText` 변경 시 `categoryKey` 재계산)로 셀러 추가·수정·삭제. UI는 관리자 명단 탭 `RosterTable`(추가 폼 + 행별 인라인 수정/삭제, 2매대 즉시 토글). 일괄 업로드는 `importSellers`.
- **버스킹/근무자**는 **편집 가능한 전역 데이터** `AppData.{busking,staff}`(날짜 기준, 양 어댑터 영속·`0004_schedules.sql`). 조회는 순수 셀렉터 `buskingForDate/staffForDate(entries, date)`, 시드/상수는 `lib/data/{busking,staff}.ts`(`SEED_*`, `STAGE_FRONT_SEATS`). **가져오기는 텍스트만 처리**(OCR/AI 호출 없음): 운영자가 `BUSKING_PROMPT`/`STAFF_PROMPT`를 자기 AI에 사진과 함께 입력→구조화 텍스트를 관리자 버스킹/근무자 탭에 붙여넣으면 `lib/data/schedule-parse.ts`가 파싱(`날짜|…` 형식). 향제한 기능은 제거됨.
- **지도 라벨/크롭**: `lib/venue/bounds.ts`가 원본 엑셀의 건물명·상가명·구조물(`LANDMARKS`) 전체를 `VISIBLE_LANDMARKS`로 노출하고 bounds도 라벨 전체에 맞춤. `SeatMap`은 `normalizeMapLabel`로 글자 사이 `·`/한글 사이 `.`를 제거하고, 엑셀의 단어 공백은 보존하되 `문 화 의 거 리` 같은 글자 단위 공백은 자연스럽게 붙인다. 배정 셀러명은 좌석 번호 아래에 넣지 않고, 선 없는 티켓형 배지(좌석번호 칩+상호명)로 표시. 상호명 동기화는 `tests/venue-layout.test.ts`가 원본 엑셀과 비교한다.
- **나무매대 표시**: 배정 좌석이 wood(`states[code].type==="wood"`, `event.woodSeatCodes`)면 셀러/키오스크에 나무매대 배지. 버스킹·근무자 관리 UI는 `MonthBar`로 월별 조회.

## 작업 시
변경 사항은 [docs/PROGRESS.md](docs/PROGRESS.md) 최상단에 기록할 것.
