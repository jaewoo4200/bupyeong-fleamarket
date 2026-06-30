"use client";

import { useState } from "react";
import type { SeatMapProps } from "./SeatMap";
import { SeatMapPanel, type SeatMapPanelSize } from "./SeatMapPanel";
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
  size,
  expandable,
  ...mapProps
}: {
  view: "band1" | "band2";
  caption?: string;
  size?: SeatMapPanelSize;
  expandable?: boolean;
} & Omit<SeatMapProps, "view">) {
  return (
    <SeatMapPanel view={view} caption={caption} size={size} expandable={expandable} {...mapProps} />
  );
}

export function VenueMapViewer({
  defaultView = "all",
  showTabs = true,
  size = "standard",
  expandable = true,
  className,
  ...mapProps
}: {
  defaultView?: View;
  showTabs?: boolean;
  size?: SeatMapPanelSize;
  expandable?: boolean;
  className?: string;
} & Omit<SeatMapProps, "view">) {
  const [view, setView] = useState<View>(defaultView);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showTabs && (
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
      )}

      {view === "all" ? (
        <div className="flex flex-col gap-3">
          <MapPanel
            view="band1"
            caption="윗구간 — 문화의거리 입구 ~ 중앙무대"
            size={size}
            expandable={expandable}
            {...mapProps}
          />
          <MapPanel
            view="band2"
            caption="아랫구간 — 중앙무대 ~ 분수대 ~ 문화의거리 입구"
            size={size}
            expandable={expandable}
            {...mapProps}
          />
        </div>
      ) : (
        <MapPanel view={view} size={size} expandable={expandable} {...mapProps} />
      )}
    </div>
  );
}
