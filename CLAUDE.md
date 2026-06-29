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
- **유효 좌석**은 항상 `effectiveSeats(event)` 사용: 결합석 분리(`splitSeatCodes`)·임의 좌석(`customSeats`)·비활성(`inactiveSeatCodes`) 반영.
- 버스킹/근무표는 `lib/data/{busking,staff}.ts`(행사일 기준 조회, 데모 6·7월). 향제한 기능은 제거됨.

## 작업 시
변경 사항은 [docs/PROGRESS.md](docs/PROGRESS.md) 최상단에 기록할 것.
