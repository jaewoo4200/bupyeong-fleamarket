import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { LANDMARKS } from "@/lib/venue/venue-layout";

test("자리배치도 상호/랜드마크 라벨은 원본 엑셀과 일치", () => {
  const wb = XLSX.readFile("_input/2026년 플리마켓 자리배치도_최종.xlsx", { cellStyles: true });
  const ws = wb.Sheets["플리마켓"];
  assert.ok(ws, "플리마켓 시트가 있어야 함");

  const fromExcel = (ws["!merges"] ?? [])
    .map((merge) => {
      const addr = XLSX.utils.encode_cell(merge.s);
      return ws[addr]?.v == null ? "" : String(ws[addr].v).replace(/\s+/g, " ").trim();
    })
    .filter((label) => label && !label.startsWith("2026년") && !/^[\d,\-\s]+$/.test(label))
    .sort();

  const fromCode = LANDMARKS.map((landmark) => landmark.label).sort();
  assert.equal(fromCode.length, fromExcel.length);
  assert.deepEqual(fromCode, fromExcel);
});
