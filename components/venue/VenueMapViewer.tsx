"use client";

import { useState } from "react";
import { Store, Eye } from "lucide-react";
import { SeatMap, type SeatMapProps } from "./SeatMap";
import { aspectFor } from "@/lib/venue/bounds";
import { cn } from "@/lib/ui/cn";

type View = "all" | "band1" | "band2";

const TABS: { key: View; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "band1", label: "윗구간 · 1~29·57~80" },
  { key: "band2", label: "아랫구간 · 30~56" },
];

function MapPanel({
  view,
  caption,
  hideStores,
  ...mapProps
}: { view: "band1" | "band2"; caption?: string; hideStores?: boolean } & Omit<SeatMapProps, "view">) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white p-2 shadow-soft">
      {caption && <p className="px-1.5 pb-1.5 pt-0.5 text-xs font-bold text-ink-500">{caption}</p>}
      <div style={{ aspectRatio: aspectFor(view, hideStores) }} className="w-full">
        <SeatMap view={view} hideStores={hideStores} {...mapProps} />
      </div>
    </div>
  );
}

export function VenueMapViewer({
  defaultView = "all",
  showTabs = true,
  className,
  ...mapProps
}: {
  defaultView?: View;
  showTabs?: boolean;
  className?: string;
} & Omit<SeatMapProps, "view" | "hideStores">) {
  const [view, setView] = useState<View>(defaultView);
  const [showStores, setShowStores] = useState(false); // 기본: 주변 상가 숨김(좌석이 더 크게 보임)
  const hideStores = !showStores;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showTabs && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  view === t.key
                    ? "bg-ink-900 text-cream-50"
                    : "bg-cream-100 text-ink-500 hover:bg-cream-200",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowStores((v) => !v)}
            title="주변 상가(벤치·자리번호 없는 가게) 라벨 표시/숨김"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              showStores
                ? "bg-coral-50 text-coral-700"
                : "bg-cream-100 text-ink-500 hover:bg-cream-200",
            )}
          >
            {showStores ? <Eye className="size-3.5" /> : <Store className="size-3.5" />}
            주변 상가 {showStores ? "숨기기" : "보기"}
          </button>
        </div>
      )}

      {view === "all" ? (
        <div className="flex flex-col gap-3">
          <MapPanel view="band1" hideStores={hideStores} caption="윗구간 — 문화의거리 입구 ~ 중앙무대" {...mapProps} />
          <MapPanel view="band2" hideStores={hideStores} caption="아랫구간 — 중앙무대 ~ 분수대 ~ 문화의거리 입구" {...mapProps} />
        </div>
      ) : (
        <MapPanel view={view} hideStores={hideStores} {...mapProps} />
      )}
    </div>
  );
}
