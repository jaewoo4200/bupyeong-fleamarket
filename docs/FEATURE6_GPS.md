# 기능 6 — GPS 기반 자리 길안내 (조사 + 단계 계획)

> 결론: **순수 GPS만으로는 좌석(약 1.5m) 단위 핀포인트가 불가**. "개략 위치 + 시각적 배치도 +
> 랜드마크 안내"의 하이브리드가 현실적. AR 내비는 iOS 미지원으로 아직 보류.

## 조사 요약 (2026-06 기준)
| 항목 | 결과 | 함의 |
|---|---|---|
| 브라우저 Geolocation 정확도 | 실외 도심 **~10–15m** (95% 신뢰) | 좌석 단위 부족 → 개략 안내용 |
| `enableHighAccuracy` | GPS 우선, 수초 후 수 m | watchPosition로 점진 수렴 |
| iOS WebXR AR 모듈 | **미활성**(Vision Pro 외) | 앱 없는 AR 내비 비권장 |
| 방위(heading) | iOS `DeviceOrientationEvent.webkitCompassHeading`, 권한 제스처 필요 | 나침반 화살표 가능 |
| 지도 타일(국내) | Kakao Maps JS SDK가 적합(커스텀 오버레이 지원) | 행사장 폴리곤 + 마커 |
| 공통 전제 | Geolocation·DeviceOrientation 모두 **HTTPS 필수** | 배포 시 https |

출처: MDN Geolocation/`GeolocationCoordinates.accuracy`, W3C Geolocation, WebXR 2026 자료, Kakao/Naver Maps JS SDK.

## 단계 계획

### A단계 — 랜드마크 텍스트 안내 (구현 완료)
- `lib/venue/directions.ts` `seatDirections(code)` → "아랫구간 · 미도인 매장 앞 · 중앙무대 왼쪽 방향 (34,34-1번)".
- 셀러 화면·키오스크 결과·현황판에서 본인 좌석 강조 + 안내 문구. 좌표/SDK 불필요, 즉시 유용.

### B단계 — 지도 + 현재위치 점 + 나침반 화살표 (설계)
1. Kakao Maps JS SDK 로드(앱키 필요). 행사장 폴리곤 오버레이 — 중심 `37.49414268, 126.72426974`.
2. 배치도 좌석 좌표 ↔ 위경도 매핑: 거리 양 끝 2~3개 기준점(예: 문화의거리 입구, 중앙무대, 분수대)의
   실제 위경도를 측정 → affine 변환(스케일·회전·평행이동)으로 모든 좌석에 위경도 부여.
3. `navigator.geolocation.watchPosition({enableHighAccuracy:true})` → 현재위치 점 표시.
4. `DeviceOrientationEvent`(iOS는 `requestPermission()` + `webkitCompassHeading`)로 진행 방향 화살표.
5. 목표 좌석까지 직선 + 남은 거리("약 30m") 표시. **마지막 몇 m는 배치도 스키매틱으로 보완**(정확도 한계).
6. 권한 거부/미지원 시 A단계(텍스트 안내)로 폴백.

### C단계 — (선택) 정밀 측위
- BLE 비컨/UWB는 인프라 비용↑. AR(WebXR)은 iOS 지원 시 재평가. 현재 권장 안 함.

## 구현 메모
- A단계는 이미 동작. B단계 착수 시 `components/venue/GpsGuide.tsx` 신설 + Kakao 스크립트는
  `app/layout.tsx`나 동적 로드. 기준점 위경도는 현장 실측 1회 필요(운영팀 협조).
- 좌석 위경도 매핑 파라미터는 `lib/venue/geo.ts`(신설)에 상수로 둔다.
