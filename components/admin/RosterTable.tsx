"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Select } from "@/components/ui/input";
import { useStore } from "@/lib/data/hooks";
import { getCategory } from "@/lib/venue/categories";
import { effectiveSeats } from "@/lib/venue/seats";
import type { EventConfig, Seller } from "@/lib/data/types";

export function RosterTable({
  event,
  sellers,
}: {
  event: EventConfig;
  sellers: Seller[];
}) {
  const store = useStore();
  const inactive = useMemo(() => new Set(event.inactiveSeatCodes), [event.inactiveSeatCodes]);
  const taken = useMemo(() => {
    const m = new Map<string, string>(); // seatCode -> sellerId
    for (const s of sellers) if (s.assignedSeat) m.set(s.assignedSeat, s.id);
    return m;
  }, [sellers]);

  const seatOptions = useMemo(
    () => effectiveSeats(event).filter((s) => !inactive.has(s.code)).sort((a, b) => a.num - b.num),
    [event, inactive],
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-cream-200 bg-cream-50 text-xs text-ink-500">
          <tr>
            <th className="px-3 py-2.5 font-semibold">번호</th>
            <th className="px-3 py-2.5 font-semibold">상호 / 이름</th>
            <th className="px-3 py-2.5 font-semibold">카테고리</th>
            <th className="px-3 py-2.5 font-semibold">2매대</th>
            <th className="px-3 py-2.5 font-semibold">배정 자리</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((s) => {
            const cat = getCategory(s.categoryKey);
            return (
              <tr key={s.id} className="border-b border-cream-100 last:border-0 hover:bg-cream-50">
                <td className="px-3 py-2 tnum text-ink-400">{s.seq}</td>
                <td className="px-3 py-2">
                  <div className="font-bold text-ink-900">{s.business}</div>
                  <div className="text-xs text-ink-400">{s.name}</div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.label}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => store.setSellerTwoTables(s.id, !s.twoTables)}
                    className={
                      s.twoTables
                        ? "rounded-full bg-coral-100 px-2 py-1 text-xs font-semibold text-coral-700"
                        : "rounded-full bg-cream-100 px-2 py-1 text-xs font-semibold text-ink-400"
                    }
                    title="클릭하여 2매대(붙임석) 셀러 토글"
                  >
                    {s.twoTables ? "2매대 ●" : "1매대"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={s.assignedSeat ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) store.reassignSeat(event.id, s.id, v);
                      else store.clearAssignment(event.id, s.id);
                    }}
                    className="h-8 w-28 text-xs"
                  >
                    <option value="">미배정</option>
                    {seatOptions.map((opt) => {
                      const occupiedBy = taken.get(opt.code);
                      const mine = occupiedBy === s.id;
                      return (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}
                          {occupiedBy && !mine ? " (교환)" : ""}
                        </option>
                      );
                    })}
                  </Select>
                </td>
                <td className="px-3 py-2 text-right">
                  {s.assignedSeat && (
                    <button
                      onClick={() => store.clearAssignment(event.id, s.id)}
                      className="inline-flex size-7 items-center justify-center rounded-lg text-ink-300 hover:bg-rose-50 hover:text-rose-500"
                      title="배정 취소"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {sellers.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center text-sm text-ink-400">
                명단이 비어 있습니다. 위에서 엑셀을 업로드하세요.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
