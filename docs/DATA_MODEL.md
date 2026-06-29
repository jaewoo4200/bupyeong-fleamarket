# 데이터 모델

타입 정의: `lib/data/types.ts`. 운영 DB 스키마: `supabase/migrations/`.

## 엔티티

### EventConfig (행사 = 하루치 설정)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | string | |
| date | string | YYYY-MM-DD |
| weekday | "금"\|"토"\|"일" | |
| eventType | "fleamarket"\|"bbday" | 플리마켓 / 비비데이 |
| name | string | 표시명 |
| status | draft\|lottery_open\|lottery_closed\|completed | 진행 단계 |
| countWood/Table/Chair | number | 매대·테이블·의자 수(가변) |
| woodSeatCodes | string[] | 오늘 나무매대 좌석 |
| inactiveSeatCodes | string[] | 오늘 미사용(추첨 제외) 좌석 |
| splitSeatCodes | string[] | 2매대 결합석을 단독 2석으로 분리할 좌석 |
| customSeats | CustomSeat[] | 임의 추가 좌석(지도 탭 생성) |

### Seller (참가자, 행사별)
| 필드 | 타입 | 설명 |
|---|---|---|
| id, eventId | string | |
| seq | number | 번호 |
| business, name | string | 상호 / 이름 |
| productText | string | 취급상품 원문 |
| categoryKey | CategoryKey | 14종 중 자동 분류 (`lib/venue/categories`) |
| phone | string? | (현재 엑셀엔 없음) |
| assignedSeat | string\|null | 배정 좌석 코드 |
| drawnAt | string\|null | 추첨 시각 |

### DrawLog (감사 로그)
`action`: draw \| redraw \| reassign \| swap \| deactivate \| reset. 모든 배정 변경 기록.

### SeatGeo / LandmarkGeo (정적 배치 데이터, 자동 생성)
`lib/venue/venue-layout.ts` — `code`(유니크 라벨), `num`(대표번호), `x/y/w/h`, `band`, `woodCapable`.

## 카테고리 (14)
보석·액세서리 / 문구·공예품 / 패브릭아트 / 향수·비누 / 식품·음료 / 동물용품 /
식물·정원 / 시각예술 / 목공예 / 세라믹·도자기 / 가죽공예 / 유리공예 / 재활용예술 / 기타.
각 카테고리는 패치워크 색(hex)을 가지며 좌석/배지 색으로 사용.

## 좌석 코드 규칙
- 일반: `"1"`~`"80"` (대표 번호).
- 서브좌석(매대 2개 등): `"8, 8-1"`, `"19-1,20"`, `"24,24-1"`, `"34,34-1"`, `"36,36-1"`, `"38,38-1"`.
- 결합석(2매대)은 `splitParts()`로 단독석 분리(예: `"8, 8-1"` → `8`,`8-1`). 행사별 `splitSeatCodes`로 토글.
- 나무매대 후보(`woodCapable`): 1~10, 73~80.
