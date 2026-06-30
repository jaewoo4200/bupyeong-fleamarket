import * as XLSX from "xlsx";

export type ParsedSeller = {
  seq: number;
  business: string;
  name: string;
  productText: string;
  phone?: string;
  twoTables: boolean;
};

/** 행 어디든 "매대 2개 / 2매대 / 매대 두개" 표기가 있으면 2매대 셀러로 인식 */
const TWO_TABLE_RE = /(2\s*매대)|(매대\s*2\s*개?)|(매대\s*두\s*개?)|매대두개/;

export type ParseResult = {
  sellers: ParsedSeller[];
  sheetName: string;
  skipped: number;
  /** 상단 셀에서 인식한 행사 날짜(YYYY-MM-DD). 없으면 undefined */
  date?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** 엑셀 날짜 일련번호 → ISO. 날짜로 보기 어려운 값은 undefined */
function excelSerialToISO(n: number): string | undefined {
  if (n <= 30000 || n >= 80000) return undefined; // 대략 2008~2119 범위만 날짜로 인정
  const d = XLSX.SSF.parse_date_code(n);
  if (!d || !d.y || d.y < 2000 || d.y > 2100) return undefined;
  return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
}

/** 셀 값(숫자 일련번호 / Date / 날짜 문자열)에서 ISO 날짜 추출 */
function dateFromCell(v: unknown): string | undefined {
  if (typeof v === "number") return excelSerialToISO(v);
  if (v instanceof Date && !isNaN(v.getTime())) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "string") {
    const m = v.trim().match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
    if (m) {
      const mo = +m[2], d = +m[3];
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${m[1]}-${pad(mo)}-${pad(d)}`;
    }
  }
  return undefined;
}

/** 시트 상단(앞 2행 × 앞 3열)에서 행사 날짜를 탐지 */
function detectDate(rows: (string | number | Date)[][]): string | undefined {
  for (let i = 0; i < Math.min(rows.length, 2); i++) {
    const r = rows[i] ?? [];
    for (let j = 0; j < Math.min(r.length, 3); j++) {
      const d = dateFromCell(r[j]);
      if (d) return d;
    }
  }
  return undefined;
}

const HEADER_HINTS = {
  seq: ["번호", "no", "순번"],
  business: ["상호", "업체", "브랜드", "셀러명"],
  name: ["이름", "성함", "대표", "성명"],
  product: ["취급", "상품", "품목", "카테고리"],
  phone: ["전화", "연락처", "휴대", "핸드폰", "번호(전화)"],
};

function matchCol(header: string, hints: string[]): boolean {
  const h = String(header).toLowerCase().replace(/\s/g, "");
  return hints.some((k) => h.includes(k.toLowerCase().replace(/\s/g, "")));
}

/**
 * 참가자리스트 엑셀(또는 첫 시트)을 파싱한다.
 * 헤더 행(상호·이름 포함)을 자동 탐지하고 번호/상호/이름/취급상품/전화 열을 매핑.
 */
export function parseSellersWorkbook(buf: ArrayBuffer): ParseResult {
  // cellDates는 일부 날짜를 자정 직전(타임존/엑셀 epoch 오차)으로 반올림해 하루가 어긋나므로,
  // raw 일련번호로 읽어 SSF로 정확히 변환한다.
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => /참가|명단|셀러|리스트/.test(n) && !/추첨/.test(n)) ??
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: "" });
  const date = detectDate(rows);

  // 헤더 행 탐지
  let headerRow = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i].map(String);
    if (r.some((c) => matchCol(c, HEADER_HINTS.business)) && r.some((c) => matchCol(c, HEADER_HINTS.name))) {
      headerRow = i;
      break;
    }
  }
  if (headerRow < 0) headerRow = 0;

  const header = rows[headerRow].map(String);
  const col = {
    seq: header.findIndex((c) => matchCol(c, HEADER_HINTS.seq)),
    business: header.findIndex((c) => matchCol(c, HEADER_HINTS.business)),
    name: header.findIndex((c) => matchCol(c, HEADER_HINTS.name)),
    product: header.findIndex((c) => matchCol(c, HEADER_HINTS.product)),
    phone: header.findIndex((c) => matchCol(c, HEADER_HINTS.phone)),
  };

  const sellers: ParsedSeller[] = [];
  let skipped = 0;
  let autoSeq = 0;
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i];
    const business = String(col.business >= 0 ? r[col.business] : "").trim();
    const name = String(col.name >= 0 ? r[col.name] : "").trim();
    if (!business && !name) {
      skipped++;
      continue;
    }
    autoSeq++;
    const seqRaw = col.seq >= 0 ? String(r[col.seq]).replace(/[^\d.]/g, "") : "";
    const seq = seqRaw ? Math.round(parseFloat(seqRaw)) : autoSeq;
    sellers.push({
      seq: Number.isFinite(seq) ? seq : autoSeq,
      business,
      name,
      productText: String(col.product >= 0 ? r[col.product] : "").trim(),
      phone: col.phone >= 0 ? String(r[col.phone]).trim() || undefined : undefined,
      twoTables: TWO_TABLE_RE.test(r.map(String).join(" ")),
    });
  }

  return { sellers, sheetName, skipped, date };
}

export async function parseSellersFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  return parseSellersWorkbook(buf);
}
