"use client";

import { useEffect, useId, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { aspectFor } from "@/lib/venue/bounds";
import { cn } from "@/lib/ui/cn";
import { SeatMap, type SeatMapProps } from "./SeatMap";

export type SeatMapPanelSize = "preview" | "standard" | "large";

type SeatMapPanelProps = Omit<SeatMapProps, "view"> & {
  view: "band1" | "band2";
  caption?: string;
  size?: SeatMapPanelSize;
  expandable?: boolean;
};

const SIZE = {
  preview: {
    padding: "p-2",
    caption: "text-xs",
    embeddedMinWidth: 560,
    modalMinWidth: 1120,
  },
  standard: {
    padding: "p-2.5",
    caption: "text-sm",
    embeddedMinWidth: 760,
    modalMinWidth: 1320,
  },
  large: {
    padding: "p-3",
    caption: "text-sm sm:text-base",
    embeddedMinWidth: 1060,
    modalMinWidth: 1480,
  },
} satisfies Record<
  SeatMapPanelSize,
  { padding: string; caption: string; embeddedMinWidth: number; modalMinWidth: number }
>;

export function SeatMapPanel({
  view,
  caption,
  size = "standard",
  expandable = true,
  ...mapProps
}: SeatMapPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();
  const cfg = SIZE[size];

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  return (
    <>
      <div className={cn("overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft", cfg.padding)}>
        <div className="mb-2 flex min-h-8 items-center gap-2 px-1">
          {caption && (
            <p className={cn("min-w-0 flex-1 truncate font-extrabold text-ink-600", cfg.caption)}>
              {caption}
            </p>
          )}
          {expandable && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-cream-200 bg-white text-ink-500 shadow-sm transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
              aria-label="자리배치도 크게 보기"
              title="크게 보기"
            >
              <Maximize2 className="size-4" />
            </button>
          )}
        </div>
        <div className="overflow-x-auto overflow-y-hidden rounded-xl bg-[#fff7ef]">
          <MapCanvas view={view} minWidth={cfg.embeddedMinWidth} {...mapProps} />
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/55 p-2 backdrop-blur-sm sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cream-200 bg-cream-50 shadow-card">
            <div className="flex items-center gap-3 border-b border-cream-200 px-4 py-3 sm:px-5">
              <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-extrabold text-ink-900">
                {caption ?? "자리배치도"}
              </h2>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-cream-50 transition-colors hover:bg-ink-700 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
                aria-label="자리배치도 닫기"
                title="닫기"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-white p-3 sm:p-5">
              <div className="mx-auto w-full">
                <MapCanvas view={view} minWidth={cfg.modalMinWidth} {...mapProps} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MapCanvas({
  view,
  minWidth,
  ...mapProps
}: Omit<SeatMapProps, "view"> & { view: "band1" | "band2"; minWidth: number }) {
  return (
    <div
      className="w-full"
      style={{
        aspectRatio: aspectFor(view),
        minWidth,
      }}
    >
      <SeatMap view={view} {...mapProps} />
    </div>
  );
}
