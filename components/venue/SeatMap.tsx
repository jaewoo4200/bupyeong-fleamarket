"use client";

import { SEATS, LANDMARKS, type LandmarkKind, type SeatGeo } from "@/lib/venue/venue-layout";
import { boundsFor, viewBoxStr, BAND1_BOUNDS, BAND2_BOUNDS } from "@/lib/venue/bounds";
import { getCategory } from "@/lib/venue/categories";
import { BENCH_TINT, BENCH_SOLID } from "@/lib/venue/bench";
import type { SeatCellState } from "@/lib/data/types";
import { cn } from "@/lib/ui/cn";

export type { SeatCellState };

export type SeatMapProps = {
  states?: Record<string, SeatCellState>;
  highlightCode?: string | null;
  onSeatClick?: (code: string) => void;
  /** 빈 지도 영역 클릭(좌석 추가용). viewBox 좌표를 전달. */
  onMapClick?: (x: number, y: number) => void;
  view?: "all" | "band1" | "band2";
  showOccupantNames?: boolean;
  /** 렌더할 좌석 목록 (기본 정적 SEATS). 결합석 분리·커스텀 좌석 반영 시 effectiveSeats 전달. */
  seats?: SeatGeo[];
  className?: string;
};

const LANDMARK_STYLE: Record<
  LandmarkKind,
  { fill: string; text: string; stroke?: string }
> = {
  store: { fill: "#ffffff", text: "#978a7c" },
  stage: { fill: "#2a2320", text: "#fdfbf7" },
  fountain: { fill: "#c9efe6", text: "#0e7e69", stroke: "#2bb89e" },
  power: { fill: "#efe7d7", text: "#b4a89b" },
  control: { fill: "#efe7d7", text: "#756a5e" },
  food_truck: { fill: "#fbf0d2", text: "#d99e2b" },
  stall: { fill: "#e2d5bf", text: "#756a5e" },
  entrance: { fill: "#ffe2d6", text: "#b33a14" },
  sculpture: { fill: "#efe7d7", text: "#978a7c" },
};

export function SeatMap({
  states,
  highlightCode,
  onSeatClick,
  onMapClick,
  view = "all",
  showOccupantNames = false,
  seats = SEATS,
  className,
}: SeatMapProps) {
  const viewBox = viewBoxStr(boundsFor(view));

  const inBand = (band: 1 | 2) => view === "all" || band === (view === "band1" ? 1 : 2);
  const visibleSeats = seats.filter((s) => inBand(s.band));
  const visibleLandmarks = LANDMARKS.filter((l) => inBand(l.band));

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onMapClick) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
    const x = vx + ((e.clientX - rect.left) / rect.width) * vw;
    const y = vy + ((e.clientY - rect.top) / rect.height) * vh;
    onMapClick(x, y);
  }

  return (
    <svg
      viewBox={viewBox}
      onClick={onMapClick ? handleSvgClick : undefined}
      className={cn("h-full w-full select-none", onMapClick && "cursor-crosshair", className)}
      role="img"
      aria-label="부평 문화의거리 플리마켓 자리배치도"
    >
      {/* 거리(street) 배경 */}
      {(view === "all" || view === "band1") && (
        <rect {...rectPad(BAND1_BOUNDS, 3)} rx="6" fill="#fdf0e8" />
      )}
      {(view === "all" || view === "band2") && (
        <rect {...rectPad(BAND2_BOUNDS, 3)} rx="6" fill="#fdf0e8" />
      )}

      {/* 랜드마크 / 구조물 */}
      {visibleLandmarks.map((l, i) => {
        const st = LANDMARK_STYLE[l.kind];
        const vertical = l.h > l.w * 1.5;
        const labelLen = Math.max(1, l.label.replace(/·/g, "").length);
        const fontSize = vertical
          ? Math.max(3.2, Math.min(l.w * 0.6, 6))
          : Math.max(4.5, Math.min(l.h * 0.42, (l.w * 0.92) / (labelLen * 0.62), 9));
        const cx = l.x + l.w / 2;
        const cy = l.y + l.h / 2;
        return (
          <g key={`lm-${i}`}>
            <rect
              x={l.x}
              y={l.y}
              width={l.w}
              height={l.h}
              rx={1.5}
              fill={st.fill}
              stroke={st.stroke ?? "#efe7d7"}
              strokeWidth={0.4}
            />
            <text
              x={cx}
              y={cy}
              fontSize={fontSize}
              fill={st.text}
              textAnchor="middle"
              dominantBaseline="central"
              transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
              style={{ pointerEvents: "none" }}
            >
              {l.label}
            </text>
          </g>
        );
      })}

      {/* 좌석 */}
      {visibleSeats.map((s) => {
        const state = states?.[s.code];
        const isHighlight = highlightCode === s.code;
        const occupant = state?.occupant;
        const cat = occupant ? getCategory(occupant.categoryKey) : null;
        const inactive = state?.status === "inactive";
        const assigned = state?.status === "assigned" && !!occupant;
        const wood = state?.type === "wood" || (!state && s.woodCapable);

        const fill = inactive
          ? "#f8f3ea"
          : assigned && cat
            ? cat.color
            : BENCH_TINT[s.palette]; // 빈 좌석은 벤치색 연한 틴트(엑셀 빨강/파랑 반영)
        const textColor = assigned ? "#ffffff" : inactive ? "#b4a89b" : "#4a4039";
        const stroke = isHighlight ? "#ec5e2e" : assigned && cat ? cat.color : "#e2d5bf";

        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        const showName = showOccupantNames && assigned && !!occupant;
        const numFont = showName
          ? Math.min(s.h * 0.38, 8)
          : Math.min(s.h * 0.62, s.w * 0.8, 14);

        return (
          <g
            key={s.code}
            onClick={
              onSeatClick
                ? (e) => {
                    e.stopPropagation();
                    onSeatClick(s.code);
                  }
                : undefined
            }
            className={onSeatClick ? "cursor-pointer" : undefined}
            opacity={inactive ? 0.55 : 1}
          >
            {isHighlight && (
              <rect
                x={s.x - 2}
                y={s.y - 2}
                width={s.w + 4}
                height={s.h + 4}
                rx={2}
                fill="none"
                stroke="#ec5e2e"
                strokeWidth={0.9}
                className="animate-pulse"
              />
            )}
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={1.4}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHighlight ? 1 : 0.5}
            />
            {/* 나무매대 표시: 상단 브라운 바 */}
            {wood && !inactive && (
              <rect x={s.x} y={s.y} width={s.w} height={1.4} rx={0.7} fill="#A9744F" />
            )}
            {/* 벤치/의자 구분 표식: 좌하단 점 (배정 좌석에서도 보이도록) */}
            {!inactive && s.palette !== "none" && (
              <circle cx={s.x + 1.9} cy={s.y + s.h - 1.9} r={1.35} fill={BENCH_SOLID[s.palette]} stroke="#ffffff" strokeWidth={0.6} />
            )}
            <text
              x={cx}
              y={showName ? s.y + s.h * 0.34 : cy}
              fontSize={numFont}
              fontWeight={700}
              fill={textColor}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ pointerEvents: "none" }}
              className="tnum"
            >
              {s.code}
            </text>
            {showName && occupant && (
              <text
                x={cx}
                y={s.y + s.h * 0.72}
                fontSize={Math.min(s.h * 0.3, 3.6)}
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ pointerEvents: "none" }}
              >
                {occupant.business.length > 5
                  ? occupant.business.slice(0, 5) + "…"
                  : occupant.business}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function rectPad(b: { x: number; y: number; w: number; h: number }, p: number) {
  return { x: b.x - p, y: b.y - p, width: b.w + p * 2, height: b.h + p * 2 };
}
