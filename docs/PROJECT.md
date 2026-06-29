# 부평 문화의거리 플리마켓 자리 추첨 웹앱

부평 문화의거리 주말 플리마켓의 **셀러 자리 추첨**을 디지털화한 웹앱. 기존 종이 번호표를
통에서 뽑던 방식을 자리배치도 기반의 터치 추첨 + 실시간 현황 공유로 대체한다.

> 이 문서는 프로젝트 개요·현재 상태·실행 방법의 단일 진입점이다.
> 세부는 [ARCHITECTURE](./ARCHITECTURE.md) · [DATA_MODEL](./DATA_MODEL.md) · [DECISIONS](./DECISIONS.md)
> · [PROGRESS](./PROGRESS.md) · [FEATURE6_GPS](./FEATURE6_GPS.md) 참고.

## 현재 상태 (PoC)
요구사항 1~5 **구현 완료**, 6번(GPS 길안내)은 조사 완료 + 1차(랜드마크 텍스트 안내) 구현.

| # | 기능 | 상태 |
|---|---|---|
| 1 | 자리배치도 기반 랜딩 | ✅ `/` + `components/venue/SeatMap` (엑셀 좌표 기반) |
| 2 | 엑셀 명단 파싱 → 당일 명단 | ✅ `/admin` 업로드 (`lib/excel/parseSellers`) |
| 3 | 터치 추첨 + 배치도 반영 | ✅ `/kiosk` (룰렛 애니메이션, 향제한 자동 재추첨) |
| 4 | 관리자/셀러 UI 분리 | ✅ `/admin`·`/kiosk`(로그인) vs `/seller`·`/board`(공개) |
| 5 | 현장 수동 수정 | ✅ 재배정/교환/취소 · 좌석 비활성(추첨 제외) · 나무매대 · 2매대 분리/붙임 · 임의 좌석 추가 |
| 6 | GPS 길안내 | 🔬 조사 완료 · A단계(랜드마크 안내) 구현 · B단계 설계 |
| + | 버스킹 일정 알림 | ✅ 행사일 공연 시 무대 앞(27~29·57~59) 제외 제안 (`lib/data/busking.ts`) |
| + | 근무표 표시 | ✅ 행사일 근무자 표시 (`lib/data/staff.ts`) |

## 기술 스택
- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** (CSS-first `@theme`) · Pretendard · Framer Motion · lucide-react
- **데이터**: 현재 **로컬 어댑터**(localStorage + BroadcastChannel 실시간) — 무설정 즉시 실행.
  운영 전환 시 **Supabase**(Postgres+Realtime+Auth) — `supabase/` 마이그레이션 준비됨.
- **엑셀**: SheetJS(`xlsx`)

## 실행
```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build
```
- 시드 데이터(샘플 명단 40명, 2026-07-04 토 플리마켓)가 자동 로드된다.
- 관리자 로그인 비밀번호(PoC): `bupyeong` (`NEXT_PUBLIC_ADMIN_PASSWORD`로 변경).

## 라우트
| 경로 | 대상 | 설명 |
|---|---|---|
| `/` | 공개 | 랜딩 + 자리배치도 미리보기 |
| `/seller` | 공개 | 이름/상호 검색 → 선정 여부·배정 자리·길안내 |
| `/board` | 공개/대형화면 | 실시간 추첨 현황판 |
| `/kiosk` | 관리자 | 터치 추첨(룰렛 → 좌석 공개 → 지도 반영) |
| `/admin` | 관리자 | 현황·명단(업로드)·자리설정·행사 관리 |

## 핵심 규칙 (도메인)
- 좌석 1~80번 + 서브좌석(`8, 8-1`, `19-1,20`, `24,24-1`, `34,34-1`, `36,36-1`, `38,38-1`).
- 좌석 박스 색(엑셀): **빨강=벤치 있음, 파랑=의자 지급 필요** (`lib/venue/bench.ts`).
- 결합석(2매대)은 행사당 분리/붙임 선택(최대 5팀). 임의 좌석 추가·좌석 비활성 가능 → 모두 `effectiveSeats(event)`로 반영.
- 좌석 1~10 & 73~80은 나무매대(나무) 운영 가능. 행사/요일별 구성 가변. (향제한 기능은 제거됨)

## 원본 파일
`_input/` — 자리배치도 엑셀, 캡쳐본, 셀러 리스트(OT) 엑셀. 좌표·시드는 여기서 추출됨.
