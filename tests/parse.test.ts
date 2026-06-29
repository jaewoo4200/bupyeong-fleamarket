import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSellersWorkbook } from "@/lib/excel/parseSellers";
import { categorize } from "@/lib/venue/categories";

test("categorize: 취급상품 자유 텍스트 → 카테고리", () => {
  assert.equal(categorize("향수 및 비누: 수공예로 만든 향수, 비누"), "perfume");
  assert.equal(categorize("보석 및 액세서리: 목걸이, 팔찌"), "jewelry");
  assert.equal(categorize("목공예: 나무 그릇, 조각품"), "wood");
  assert.equal(categorize("기타: 핸드메이드 제품 등"), "etc");
});

test("실제 셀러 엑셀(_input)을 파싱한다", () => {
  const buf = readFileSync("_input/마켓 오티용품.xlsx");
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const res = parseSellersWorkbook(ab as ArrayBuffer);
  assert.equal(res.sheetName, "참가자리스트");
  assert.ok(res.sellers.length >= 38, `셀러 수 부족: ${res.sellers.length}`);
  const first = res.sellers[0];
  assert.equal(first.seq, 1);
  assert.equal(first.business, "숑누나손뜨개");
  assert.equal(first.name, "김은미");
});
