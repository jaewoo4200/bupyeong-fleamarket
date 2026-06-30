"use client";

import { useRef, useState } from "react";
import { SEATS, type LandmarkKind, type SeatGeo } from "@/lib/venue/venue-layout";
import { boundsFor, viewBoxStr, BAND1_BOUNDS, BAND2_BOUNDS, VISIBLE_LANDMARKS } from "@/lib/venue/bounds";
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
  /** 드래그 영역 선택(일괄 제외). 드래그한 사각형 안 좌석 코드를 전달. */
  lasso?: boolean;
  onLasso?: (codes: string[]) => void;
  className?: string;
};

/** 한글/전각은 ~1.0em, 라틴은 ~0.55em, 구분점·공백은 ~0.3em 으로 텍스트 폭(em) 추정 */
function estWidthEm(s: string): number {
  let w = 0;
  for (const ch of s) {
    if (ch === "·" || ch === " " || ch === "/" || ch === ".") w += 0.3;
    else if (/[ᄀ-ᇿ가-힣　-〿＀-￯]/.test(ch)) w += 1.0;
    else w += 0.56;
  }
  return Math.max(0.5, w);
}

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
  lasso = false,
  onLasso,
  className,
}: SeatMapProps) {
  const viewBox = viewBoxStr(boundsFor(view));
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const boxRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragging = useRef(false);
  const setBoth = (b: { x0: number; y0: number; x1: number; y1: number } | null) => {
    boxRef.current = b;
    setBox(b);
  };

  const inBand = (band: 1 | 2) => view === "all" || band === (view === "band1" ? 1 : 2);
  const visibleSeats = seats.filter((s) => inBand(s.band));
  // 좌석 줄과 겹치는 랜드마크만(좌석 바깥 상가·구조물 strip은 bounds에서 제외됨)
  const visibleLandmarks = VISIBLE_LANDMARKS.filter((l) => inBand(l.band));

  function toViewBox(e: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
    return {
      x: vx + ((e.clientX - rect.left) / rect.width) * vw,
      y: vy + ((e.clientY - rect.top) / rect.height) * vh,
    };
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onMapClick) return;
    const { x, y } = toViewBox(e);
    onMapClick(x, y);
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!lasso) return;
    dragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const { x, y } = toViewBox(e);
    setBoth({ x0: x, y0: y, x1: x, y1: y });
  }
  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!lasso || !dragging.current) return;
    const { x, y } = toViewBox(e);
    const b = boxRef.current;
    if (b) setBoth({ ...b, x1: x, y1: y });
  }
  function onUp() {
    if (!lasso || !dragging.current) return;
    dragging.current = false;
    const box = boxRef.current;
    if (box && onLasso) {
      const lx = Math.min(box.x0, box.x1), rx = Math.max(box.x0, box.x1);
      const ty = Math.min(box.y0, box.y1), by = Math.max(box.y0, box.y1);
      const hit = visibleSeats
        .filter((s) => {
          const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
          return cx >= lx && cx <= rx && cy >= ty && cy <= by;
        })
        .map((s) => s.code);
      if (hit.length) onLasso(hit);
    }
    setBoth(null);
  }

  return (
    <svg
      viewBox={viewBox}
      onClick={onMapClick ? handleSvgClick : undefined}
      onPointerDown={lasso ? onDown : undefined}
      onPointerMove={lasso ? onMove : undefined}
      onPointerUp={lasso ? onUp : undefined}
      className={cn(
        "h-full w-full select-none",
        (onMapClick || lasso) && "cursor-crosshair",
        lasso && "touch-none",
        className,
      )}
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
        const labelEm = estWidthEm(l.label);
        const cx = l.x + l.w / 2;
        const cy = l.y + l.h / 2;
        // 회전 라벨은 길이축=높이, 폭축=너비 / 가로 라벨은 그 반대
        const availLen = (vertical ? l.h : l.w) * 0.92;
        const availThick = (vertical ? l.w : l.h) * 0.78;
        // 폭에 맞춰 글자 크기 산정(한글 폭 반영) → 높이/절대 상한으로 클램프
        const fontSize = Math.max(7, Math.min(availThick * 0.95, (availLen / labelEm) * 1.08, 20));
        // 그래도 넘치면 textLength로 압축해 잘림 방지
        const naturalLen = labelEm * fontSize;
        const textLen = naturalLen > availLen ? availLen : undefined;
        return (
          <g key={`lm-${i}`}>
            <title>{l.label}</title>
            <rect
              x={l.x}
              y={l.y}
              width={l.w}
              height={l.h}
              rx={1.5}
              fill={st.fill}
              stroke={st.stroke ?? "#efe7d7"}
              strokeWidth={0.65}
            />
            <text
              x={cx}
              y={cy}
              fontSize={fontSize}
              fill={st.text}
              textAnchor="middle"
              dominantBaseline="central"
              transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
              textLength={textLen}
              lengthAdjust={textLen ? "spacingAndGlyphs" : undefined}
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
        // 좌석번호 폰트: 코드 글자수(결합석 "24,24-1" 등)에 맞춰 폭으로도 제한 → 큰 결합석 코드가 박스를 넘지 않음
        const numFont = showName
          ? Math.min(s.h * 0.46, s.w * 0.68, 9)
          : Math.min(s.h * 0.76, (s.w * 0.94) / estWidthEm(s.code), 18);
        // 그래도 넘치면 textLength로 압축(랜드마크 라벨과 동일한 잘림 방지)
        const codeAvail = s.w * 0.9;
        const codeTextLen = estWidthEm(s.code) * numFont > codeAvail ? codeAvail : undefined;
        const nameFont = Math.min(s.h * 0.54, 10.5);

        // 상호명을 좌석 폭에 맞춰 자르고(필요시 …) textLength로 잘림 방지
        const nameAvail = s.w * 0.92;
        let nameText = occupant?.business ?? "";
        if (occupant) {
          let n = nameText.length;
          while (n > 1 && estWidthEm(nameText.slice(0, n) + (n < nameText.length ? "…" : "")) * nameFont > nameAvail) n--;
          if (n < nameText.length) nameText = nameText.slice(0, n) + "…";
        }
        const nameTextLen = occupant && estWidthEm(nameText) * nameFont > nameAvail ? nameAvail : undefined;

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
            <title>{occupant ? `${s.code} · ${occupant.business} (${occupant.name})` : `${s.code}번`}</title>
            {isHighlight && (
              <rect
                x={s.x - 2}
                y={s.y - 2}
                width={s.w + 4}
                height={s.h + 4}
                rx={2}
                fill="none"
                stroke="#ec5e2e"
                strokeWidth={1.35}
                className="animate-pulse"
              />
            )}
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={1.8}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHighlight ? 1.35 : 0.75}
            />
            {/* 나무매대 표시: 상단 브라운 바 */}
            {wood && !inactive && (
              <rect x={s.x} y={s.y} width={s.w} height={2} rx={1} fill="#A9744F" />
            )}
            {/* 벤치/의자 구분 표식: 좌하단 점 (배정 좌석에서도 보이도록) */}
            {!inactive && s.palette !== "none" && (
              <circle cx={s.x + 2.4} cy={s.y + s.h - 2.4} r={1.75} fill={BENCH_SOLID[s.palette]} stroke="#ffffff" strokeWidth={0.75} />
            )}
            <text
              x={cx}
              y={showName ? s.y + s.h * 0.34 : cy}
              fontSize={numFont}
              fontWeight={700}
              fill={textColor}
              textAnchor="middle"
              dominantBaseline="central"
              textLength={codeTextLen}
              lengthAdjust={codeTextLen ? "spacingAndGlyphs" : undefined}
              style={{ pointerEvents: "none" }}
              className="tnum"
            >
              {s.code}
            </text>
            {showName && occupant && (
              <text
                x={cx}
                y={s.y + s.h * 0.7}
                fontSize={nameFont}
                fontWeight={700}
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
                textLength={nameTextLen}
                lengthAdjust={nameTextLen ? "spacingAndGlyphs" : undefined}
                style={{ pointerEvents: "none" }}
              >
                {nameText}
              </text>
            )}
          </g>
        );
      })}

      {/* 드래그 선택 사각형 (일괄 제외) */}
      {box && (
        <rect
          x={Math.min(box.x0, box.x1)}
          y={Math.min(box.y0, box.y1)}
          width={Math.abs(box.x1 - box.x0)}
          height={Math.abs(box.y1 - box.y0)}
          fill="rgba(236,94,46,0.12)"
          stroke="#ec5e2e"
          strokeWidth={1}
          strokeDasharray="4 3"
          style={{ pointerEvents: "none" }}
        />
      )}
    </svg>
  );
}

function rectPad(b: { x: number; y: number; w: number; h: number }, p: number) {
  return { x: b.x - p, y: b.y - p, width: b.w + p * 2, height: b.h + p * 2 };
}
