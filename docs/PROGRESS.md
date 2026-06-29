# 작업 기록 (PROGRESS)

> 최신 항목을 위에 추가. 타 에이전트/세션의 컨텍스트 유지용.

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
