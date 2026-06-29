/**
 * 취급상품 카테고리 (조각보 패치워크 컬러 시스템).
 * 셀러 엑셀의 "취급상품" 자유 텍스트를 키워드로 카테고리에 매핑한다.
 */

export type CategoryKey =
  | "etc"
  | "wood"
  | "pet"
  | "stationery"
  | "visual"
  | "food"
  | "jewelry"
  | "plant"
  | "recycle"
  | "fabric"
  | "glass"
  | "perfume"
  | "ceramic"
  | "leather";

export type Category = {
  key: CategoryKey;
  label: string;
  /** 패치워크 대표 색 (hex) */
  color: string;
  /** 향나는 업체 기본값 (관리자가 셀러별로 덮어쓸 수 있음) */
  scentedByDefault: boolean;
  /** 자유 텍스트 매칭 키워드 */
  keywords: string[];
};

export const CATEGORIES: Category[] = [
  { key: "jewelry", label: "보석·액세서리", color: "#E86CA6", scentedByDefault: false, keywords: ["보석", "액세서리", "악세서리", "목걸이", "팔찌", "귀걸이", "반지"] },
  { key: "stationery", label: "문구·공예품", color: "#4C8DD6", scentedByDefault: false, keywords: ["문구", "공예품", "스티커", "카드", "지비츠", "수공예품"] },
  { key: "fabric", label: "패브릭아트", color: "#21A6A6", scentedByDefault: false, keywords: ["패브릭", "퀼트", "펠트", "바느질", "자수"] },
  { key: "perfume", label: "향수·비누", color: "#9B59B6", scentedByDefault: true, keywords: ["향수", "비누", "디퓨저", "캔들", "천연 화장품", "방향"] },
  { key: "food", label: "식품·음료", color: "#E0533D", scentedByDefault: false, keywords: ["식품", "음료", "베이커리", "과자", "잼", "소스", "커피", "차", "디저트", "브레드"] },
  { key: "pet", label: "동물용품", color: "#F2913D", scentedByDefault: false, keywords: ["동물", "반려", "펫", "강아지", "고양이", "간식"] },
  { key: "plant", label: "식물·정원", color: "#4CAF6E", scentedByDefault: false, keywords: ["식물", "화분", "정원", "플랜트", "다육", "원예"] },
  { key: "visual", label: "시각예술", color: "#6C5CE7", scentedByDefault: false, keywords: ["시각", "캐리커처", "캐처커처", "캐리커쳐", "타투", "초상화", "그림", "일러스트"] },
  { key: "wood", label: "목공예", color: "#A9744F", scentedByDefault: false, keywords: ["목공", "목재", "나무 장난감", "나무 그릇", "우드", "조각품"] },
  { key: "ceramic", label: "세라믹·도자기", color: "#C8794B", scentedByDefault: false, keywords: ["세라믹", "도자기", "그릇", "머그", "화병"] },
  { key: "leather", label: "가죽공예", color: "#7A5230", scentedByDefault: false, keywords: ["가죽", "레더", "지갑", "벨트"] },
  { key: "glass", label: "유리공예", color: "#3FB8D6", scentedByDefault: false, keywords: ["유리", "글라스", "스테인드"] },
  { key: "recycle", label: "재활용예술", color: "#8AA63B", scentedByDefault: false, keywords: ["재활용", "업사이클", "리사이클"] },
  { key: "etc", label: "기타", color: "#9AA0A6", scentedByDefault: false, keywords: ["기타", "핸드메이드", "수공예"] },
];

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

export function getCategory(key: CategoryKey): Category {
  return BY_KEY.get(key) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** 자유 텍스트 → 카테고리 키. 가장 먼저 매칭되는 카테고리(=가장 구체적 순서). */
export function categorize(text: string | null | undefined): CategoryKey {
  if (!text) return "etc";
  const t = text.replace(/\s/g, "");
  for (const cat of CATEGORIES) {
    if (cat.key === "etc") continue;
    if (cat.keywords.some((k) => t.includes(k.replace(/\s/g, "")))) return cat.key;
  }
  return "etc";
}

export function isScentedCategory(key: CategoryKey): boolean {
  return getCategory(key).scentedByDefault;
}
