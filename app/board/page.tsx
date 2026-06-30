"use client";

import { useMemo } from "react";
import { Header } from "@/components/site/Header";
import { Badge } from "@/components/ui/badge";
import { VenueMapViewer } from "@/components/venue/VenueMapViewer";
import { CategoryLegend, StatusLegend } from "@/components/venue/Legend";
import { useCurrentEvent, useSellers } from "@/lib/data/hooks";
import { buildSeatStates, lotteryProgress } from "@/lib/data/selectors";
import { effectiveSeats } from "@/lib/venue/seats";
import { getCategory } from "@/lib/venue/categories";

export default function BoardPage() {
  const event = useCurrentEvent();
  const sellers = useSellers(event?.id);
  const states = useMemo(() => buildSeatStates(event, sellers), [event, sellers]);
  const effSeats = useMemo(() => effectiveSeats(event), [event]);
  const progress = lotteryProgress(sellers);
  const recent = sellers
    .filter((s) => s.assignedSeat && s.drawnAt)
    .sort((a, b) => (b.drawnAt! < a.drawnAt! ? -1 : 1))
    .slice(0, 6);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-8 sm:px-6">
        {!event ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-coral-600">실시간 추첨 현황</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">
                  {event.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={event.status} />
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-ink-900 tnum">
                    {progress.drawn}
                    <span className="text-base font-bold text-ink-400">/{progress.total}</span>
                  </p>
                  <p className="text-xs text-ink-400">자리 배정 완료</p>
                </div>
              </div>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-cream-200">
              <div
                className="h-full rounded-full bg-coral-600 transition-all duration-500"
                style={{ width: `${progress.total ? (progress.drawn / progress.total) * 100 : 0}%` }}
              />
            </div>

            {recent.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {recent.map((s) => {
                  const cat = getCategory(s.categoryKey);
                  return (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-2 rounded-full border border-cream-200 bg-white px-3 py-1.5 text-sm shadow-soft"
                    >
                      <span
                        className="flex size-6 items-center justify-center rounded-full text-xs font-bold text-white tnum"
                        style={{ backgroundColor: cat.color }}
                      >
                        {s.assignedSeat}
                      </span>
                      <span className="font-semibold text-ink-900">{s.business}</span>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mt-6">
              <VenueMapViewer states={states} seats={effSeats} showOccupantNames size="large" />
            </div>

            <div className="mt-6 grid gap-5 rounded-2xl border border-cream-200 bg-white p-5 sm:grid-cols-[auto_1fr]">
              <div className="sm:border-r sm:border-cream-200 sm:pr-5">
                <p className="mb-2 text-sm font-bold text-ink-700">자리 상태</p>
                <StatusLegend />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-ink-700">취급상품 카테고리</p>
                <CategoryLegend />
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "gold" | "teal" | "neutral" | "coral" }> = {
    draft: { label: "준비중", variant: "neutral" },
    lottery_open: { label: "추첨 진행중", variant: "coral" },
    lottery_closed: { label: "추첨 마감", variant: "gold" },
    completed: { label: "완료", variant: "teal" },
  };
  const s = map[status] ?? map.draft;
  return <Badge variant={s.variant}>● {s.label}</Badge>;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-white py-20 text-center">
      <p className="text-lg font-bold text-ink-700">진행 중인 행사가 없습니다</p>
      <p className="mt-1 text-sm text-ink-400">관리자 화면에서 행사를 만들고 명단을 업로드하세요.</p>
    </div>
  );
}
