"use client";

import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Input } from "@/components/ui/input";

/** "YYYY-MM"을 delta개월 이동 */
export function shiftMonth(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** 월별 조회 바: 이전/다음 달 + 월 선택 + 전체 보기 토글 */
export function MonthBar({
  ym,
  setYm,
  showAll,
  setShowAll,
  count,
  totalCount,
  unit,
}: {
  ym: string;
  setYm: (v: string) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  count: number;
  totalCount: number;
  unit: string;
}) {
  const label = `${ym.slice(0, 4)}년 ${+ym.slice(5, 7)}월`;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cream-200 bg-white p-2.5">
      <CalendarRange className="ml-1 size-4 text-coral-600" />
      <button
        disabled={showAll}
        onClick={() => setYm(shiftMonth(ym, -1))}
        className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-cream-100 disabled:opacity-30"
        aria-label="이전 달"
      >
        <ChevronLeft className="size-4" />
      </button>
      <Input type="month" value={ym} onChange={(e) => setYm(e.target.value)} disabled={showAll} className="h-9 w-40" />
      <button
        disabled={showAll}
        onClick={() => setYm(shiftMonth(ym, 1))}
        className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-cream-100 disabled:opacity-30"
        aria-label="다음 달"
      >
        <ChevronRight className="size-4" />
      </button>
      <span className="text-xs font-semibold text-ink-500">
        {showAll ? `전체 ${totalCount}${unit}` : `${label} · ${count}${unit}`}
      </span>
      <button
        onClick={() => setShowAll(!showAll)}
        className={
          "ml-auto rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
          (showAll ? "bg-coral-50 text-coral-700" : "bg-cream-100 text-ink-500 hover:bg-cream-200")
        }
      >
        {showAll ? "이 달만 보기" : "전체 보기"}
      </button>
    </div>
  );
}
