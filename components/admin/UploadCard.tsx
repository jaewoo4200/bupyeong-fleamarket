"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Check, X, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseSellersFile, type ParseResult } from "@/lib/excel/parseSellers";
import { categorize, getCategory } from "@/lib/venue/categories";
import { weekdayFromDate } from "@/lib/data/seed";
import { useAppData, useStore } from "@/lib/data/hooks";

export function UploadCard({ eventId }: { eventId: string }) {
  const store = useStore();
  const data = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [date, setDate] = useState(""); // 엑셀에서 인식/수정한 행사 날짜
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onFile(file: File) {
    setError(null);
    setDone(false);
    try {
      const res = await parseSellersFile(file);
      setPreview(res);
      setDate(res.date ?? "");
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽을 수 없습니다.");
    }
  }

  function commit() {
    if (!preview) return;
    if (date) store.importSellersForDate(date, preview.sellers);
    else store.importSellers(eventId, preview.sellers);
    setDone(true);
    setPreview(null);
    setDate("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const existingForDate = date ? data.events.find((e) => e.date === date) : undefined;

  const breakdown = preview
    ? countBy(preview.sellers.map((s) => categorize(s.productText)))
    : [];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="size-5 text-teal-500" />
        <h3 className="font-bold text-ink-900">셀러 명단 업로드</h3>
      </div>
      <p className="mt-1 text-sm text-ink-400">
        참가자리스트 엑셀(.xlsx)을 올리면 번호·상호·이름·취급상품과 <b>행사 날짜</b>를 자동 인식하고 카테고리·2매대(붙임석)를 분류합니다. 그 날짜의 행사가 없으면 자동으로 새로 만들어 적용합니다.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload /> 엑셀 파일 선택
        </Button>
        {fileName && <span className="text-sm text-ink-500">{fileName}</span>}
        {done && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600">
            <Check className="size-4" /> 명단이 적용되었습니다
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-rose-500">{error}</p>}

      {preview && (
        <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-900">
              미리보기 · <span className="text-coral-600">{preview.sellers.length}명</span>{" "}
              <span className="font-normal text-ink-400">(시트: {preview.sheetName})</span>
            </p>
            <button onClick={() => { setPreview(null); setDate(""); }} className="text-ink-300 hover:text-ink-500">
              <X className="size-4" />
            </button>
          </div>

          {/* 엑셀에서 인식한 행사 날짜 */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#d9e7f5] bg-[#f3f9ff] px-3 py-2">
            <CalendarDays className="size-4 text-[#1683c9]" />
            <span className="text-sm font-semibold text-ink-700">행사 날짜</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 rounded-lg border border-cream-300 bg-white px-2 text-sm text-ink-900 focus-visible:border-coral-400 focus-visible:outline-none"
            />
            {date ? (
              <span className="text-xs text-ink-500">
                ({weekdayFromDate(date)}) ·{" "}
                {existingForDate ? (
                  <span className="font-semibold text-teal-700">기존 행사에 적용</span>
                ) : (
                  <span className="font-semibold text-coral-700">새 행사 자동 생성</span>
                )}
              </span>
            ) : (
              <span className="text-xs text-ink-400">
                날짜를 못 읽었어요 — 비워두면 현재 선택된 행사에 적용됩니다.
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {breakdown.map(([key, n]) => {
              const c = getCategory(key);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-ink-600"
                >
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label} {n}
                </span>
              );
            })}
          </div>

          <div className="mt-3 max-h-44 overflow-auto rounded-lg border border-cream-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-cream-100 text-ink-500">
                <tr>
                  <th className="px-2 py-1.5 font-semibold">번호</th>
                  <th className="px-2 py-1.5 font-semibold">상호</th>
                  <th className="px-2 py-1.5 font-semibold">이름</th>
                  <th className="px-2 py-1.5 font-semibold">카테고리</th>
                </tr>
              </thead>
              <tbody>
                {preview.sellers.slice(0, 50).map((s, i) => {
                  const c = getCategory(categorize(s.productText));
                  return (
                    <tr key={i} className="border-t border-cream-100">
                      <td className="px-2 py-1.5 tnum text-ink-400">{s.seq}</td>
                      <td className="px-2 py-1.5 font-medium text-ink-900">{s.business}</td>
                      <td className="px-2 py-1.5 text-ink-500">{s.name}</td>
                      <td className="px-2 py-1.5">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: c.color }}>
                          {c.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={commit}>
              {date && !existingForDate ? "새 행사로 명단 만들기" : "이 명단으로 교체"}
            </Button>
            <p className="text-xs text-ink-400">해당 행사의 기존 명단·추첨 결과는 초기화됩니다.</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function countBy<T extends string>(arr: T[]): [T, number][] {
  const m = new Map<T, number>();
  for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
