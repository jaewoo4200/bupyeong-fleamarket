# 부평 플리마켓 — 디자인 킷

부평 문화의거리 플리마켓 자리 추첨 웹앱의 디자인 시스템 export. **Claude Design에서 디자인 개선용**으로
각 컴포넌트를 독립 실행 HTML 카드(`@dsCard`)로 정리했습니다.

## 구성
```
foundations/
  colors.html       색 팔레트 (브랜드·뉴트럴·상태·14 카테고리·벤치색)
  typography.html   타이포 스케일 (Pretendard)
  elevation.html    라운드·섀도 토큰
components/
  buttons.html      Button (6 variant × 4 size)
  badges.html       Badge
  cards.html        Card / 통계 카드
  inputs.html       Input · Select · Label
  logo.html         로고 (헤더/풀 로go)
  legend.html       자리 상태 · 카테고리 범례
  seat-states.html  좌석 셀 상태 (빈/배정/나무/제외/벤치)
  seat-map.html     자리배치도 샘플(SVG)
  draw-reveal.html  추첨 결과 카드
assets/             로고 이미지
```

## 원본 소스(레포)와의 매핑
- 토큰: `app/globals.css` (`@theme`)
- 컴포넌트: `components/ui/*`, `components/brand/*`, `components/venue/*`, `components/lottery/*`
- 색 의미: 카테고리 `lib/venue/categories.ts`, 벤치색 `lib/venue/bench.ts`

## Claude Design으로 가져가기
1. 각 `*.html`은 단독 렌더 가능(토큰 인라인). 브라우저로 바로 열어 미리보기.
2. Claude Design 프로젝트에 이 폴더를 업로드/가져오기 하거나, 디자인 권한 부여 후 `/design-sync`로 푸시.
3. 카드 그룹은 각 파일 첫 줄 `<!-- @dsCard group="..." -->` 주석으로 분류됩니다.

> 디자인 개선 후, 변경된 토큰/스타일을 `app/globals.css`와 `components/*`에 반영하면 앱에 적용됩니다.
