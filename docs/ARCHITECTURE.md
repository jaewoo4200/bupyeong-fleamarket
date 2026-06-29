# 아키텍처

## 레이어
```
app/            라우트 (page.tsx) — 모두 "use client" 인터랙티브 페이지
components/
  ui/           디자인 시스템 프리미티브 (Button, Card, Badge, Input/Select)
  brand/        Logo
  site/         Header, Footer
  venue/        SeatMap, VenueMapViewer, Legend  (배치도 렌더)
  lottery/      SeatRoulette (추첨 룰렛)
  admin/        AdminGate, UploadCard, RosterTable, SeatConfigMap
lib/
  venue/        venue-layout.ts(자동생성 좌표), bounds, categories, directions
  data/         types, store(로컬 어댑터), hooks, selectors, seed-sellers(자동생성)
  excel/        parseSellers (SheetJS)
  lottery/      rules (향제한 + 무작위 선택)
  ui/           cn
supabase/       migrations + seed (운영 전환용)
```

## 데이터 흐름 (현재: 로컬 어댑터)
- `DataStore`(`lib/data/store.ts`)가 **단일 진실원**. 메모리 + `localStorage` 영속 + `BroadcastChannel`로 탭 간 실시간 동기화.
- React는 `useSyncExternalStore` 기반 훅(`lib/data/hooks.ts`)으로 구독 → 추첨/수정 시 모든 화면(키오스크·현황판·셀러)이 즉시 갱신.
- 순수 로직은 `lib/lottery/rules.ts`(향제한·무작위), `lib/data/selectors.ts`(좌석 상태 빌드·검색)로 분리 → 테스트·재사용 용이.

```
[kiosk draw] → store.drawSeat() → mutate(localStorage write + emit)
   → BroadcastChannel → 다른 탭 store.reload → useSyncExternalStore re-render
   → [board / seller / admin] 실시간 반영
```

## 배치도 렌더링
- `lib/venue/venue-layout.ts`는 엑셀 셀 좌표를 정규화한 **자동 생성** 데이터(SEATS 80, LANDMARKS 84).
  - x축은 엑셀 char-width 단위 → 비율 보정 위해 **×5.25** 적용(좌석이 정사각형이 되도록).
  - 좌석/랜드마크가 band 1(윗구간: 1~29·57~80) / band 2(아랫구간: 30~56)로 구분.
- `SeatMap`은 SVG. `view`(all|band1|band2)별 viewBox는 `lib/venue/bounds.ts`가 계산.
- `VenueMapViewer`는 탭 + "전체" 시 두 band를 가로 스트립으로 스택(가로폭 활용).
- 좌석 상태(빈/배정/비활성/나무/향제한)와 카테고리 색은 `buildSeatStates()` 결과로 렌더.

## 인증 (PoC)
- `AdminGate`: localStorage 플래그 + 단일 비밀번호. `/admin`·`/kiosk` 보호.
- 운영 전환: Supabase Auth(이메일/비번)로 교체 — `AdminGate`만 바꾸면 됨.

## 좌표 재생성
원본 엑셀이 바뀌면 `_input/`의 파일로부터 좌표/시드를 재추출한다(파이썬 추출 스크립트는 세션 기록 참고).
규칙: 좌석 `code`는 엑셀 라벨 그대로(유니크), `num`은 대표 번호(정렬·향제한용).

## 운영 전환 체크리스트 (Supabase)
1. `supabase/migrations/*.sql` 적용 + `supabase/seed.sql`로 seat_catalog 시드.
2. `lib/data/store.ts`의 메서드 시그니처를 유지한 `SupabaseDataStore` 작성(동일 인터페이스) → `getStore()`가 env 유무로 선택.
3. `AdminGate`를 Supabase Auth로 교체. RLS로 관리자/공개 권한 분리.
4. 실시간은 Supabase Realtime 채널 구독으로 `emit()` 대체.
