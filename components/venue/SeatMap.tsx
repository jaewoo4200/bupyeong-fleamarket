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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeMapLabel(text: string): string {
  const cleaned = text
    .replace(/·+/g, " ")
    .replace(/(?<=[가-힣])\.(?=[가-힣])/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return compactLetterSpacedKorean(cleaned);
}

function compactLetterSpacedKorean(text: string): string {
  const compact = text.replace(/\s+/g, "");
  if (["문화의거리", "문화의거리입구", "중앙무대", "배전반", "먹거리", "웰메이드"].includes(compact)) {
    return compact;
  }

  const tokens = text.split(" ");
  if (tokens.length > 1 && tokens.every((token) => /^[가-힣]$/.test(token))) {
    return tokens.join("");
  }
  return text;
}

function splitBalanced(text: string, lineCount: number): string[] {
  if (lineCount <= 1) return [text];
  const chars = Array.from(text);
  const total = estWidthEm(text);
  const target = total / lineCount;
  const lines: string[] = [];
  let line = "";
  let width = 0;

  for (const ch of chars) {
    const chWidth = estWidthEm(ch);
    const remainingLines = lineCount - lines.length - 1;
    const remainingChars = chars.length - (lines.join("").length + line.length);
    if (remainingLines > 0 && line.trim() && width >= target && remainingChars > remainingLines) {
      lines.push(line.trim());
      line = "";
      width = 0;
    }
    line += ch;
    width += chWidth;
  }

  if (line.trim()) lines.push(line.trim());
  return lines.length ? lines : [text];
}

function compressTextLength(text: string, fontSize: number, maxWidth: number): number | undefined {
  const natural = estWidthEm(text) * fontSize;
  if (natural <= maxWidth) return undefined;
  // 지나친 glyph 압축은 오히려 안 읽히므로, 가벼운 보정까지만 textLength를 쓴다.
  return maxWidth / natural >= 0.84 ? maxWidth : undefined;
}

function fitTextLength(text: string, fontSize: number, maxWidth: number): number | undefined {
  return estWidthEm(text) * fontSize > maxWidth ? maxWidth : undefined;
}

const LANDMARK_STYLE: Record<
  LandmarkKind,
  { fill: string; text: string; stroke?: string }
> = {
  store: { fill: "#fffefb", text: "#41362f", stroke: "#ead7c4" },
  stage: { fill: "#2a2320", text: "#fdfbf7" },
  fountain: { fill: "#c9efe6", text: "#0e7e69", stroke: "#2bb89e" },
  power: { fill: "#efe7d7", text: "#8f8275" },
  control: { fill: "#efe7d7", text: "#756a5e" },
  food_truck: { fill: "#fbf0d2", text: "#a8660d" },
  stall: { fill: "#e2d5bf", text: "#756a5e" },
  entrance: { fill: "#ffe2d6", text: "#b33a14" },
  sculpture: { fill: "#efe7d7", text: "#6f6257" },
};

type OccupantLabel = {
  key: string;
  seatCode: string;
  text: string;
  fullText: string;
  color: string;
  codeWidth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
  textLength?: number;
};

type LandmarkTextLayout = {
  label: string;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  textLengths: (number | undefined)[];
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
  // 원본 엑셀의 건물명/상가명/구조물 라벨을 모두 복구해서 표시한다.
  const visibleLandmarks = VISIBLE_LANDMARKS.filter((l) => inBand(l.band));
  const occupantLabels = showOccupantNames ? buildOccupantLabels(visibleSeats, states) : [];

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
        <rect {...rectPad(BAND1_BOUNDS, 5)} rx="12" fill="#fff4ec" stroke="#efd8c4" strokeWidth={1} />
      )}
      {(view === "all" || view === "band2") && (
        <rect {...rectPad(BAND2_BOUNDS, 5)} rx="12" fill="#fff4ec" stroke="#efd8c4" strokeWidth={1} />
      )}

      {/* 랜드마크 / 구조물 */}
      {visibleLandmarks.map((l, i) => {
        const st = LANDMARK_STYLE[l.kind];
        const displayLabel = normalizeMapLabel(l.label);
        const vertical = l.h > l.w * (l.kind === "store" ? 1.02 : 1.35);
        const cx = l.x + l.w / 2;
        const cy = l.y + l.h / 2;
        // 회전 라벨은 길이축=높이, 폭축=너비 / 가로 라벨은 그 반대
        const availLen = (vertical ? l.h : l.w) * 0.88;
        const availThick = (vertical ? l.w : l.h) * 0.78;
        const labelLayout = layoutLandmarkText(displayLabel, l.kind, vertical, availLen, availThick);
        const isStore = l.kind === "store";
        const shadowOpacity = isStore ? 0.11 : 0.06;
        return (
          <g key={`lm-${i}`}>
            <title>{displayLabel}</title>
            <rect
              x={l.x + 1.4}
              y={l.y + 2}
              width={l.w}
              height={l.h}
              rx={isStore ? 4 : 3}
              fill="#3d2d22"
              opacity={shadowOpacity}
            />
            <rect
              x={l.x}
              y={l.y}
              width={l.w}
              height={l.h}
              rx={isStore ? 4 : 3}
              fill={st.fill}
              stroke={st.stroke ?? "#efe7d7"}
              strokeWidth={isStore ? 1.05 : 0.8}
            />
            <text
              x={cx}
              y={cy}
              fontSize={labelLayout.fontSize}
              fontWeight={isStore ? 850 : 800}
              fill={st.text}
              textAnchor="middle"
              dominantBaseline="central"
              transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
              style={{ pointerEvents: "none" }}
            >
              {labelLayout.lines.map((line, lineIndex) => (
                <tspan
                  key={`${line}-${lineIndex}`}
                  x={cx}
                  dy={lineIndex === 0 ? -((labelLayout.lines.length - 1) * labelLayout.lineHeight) / 2 : labelLayout.lineHeight}
                  textLength={labelLayout.textLengths[lineIndex]}
                  lengthAdjust={labelLayout.textLengths[lineIndex] ? "spacingAndGlyphs" : undefined}
                >
                  {line}
                </tspan>
              ))}
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
        // 좌석번호 폰트: 코드 글자수(결합석 "24,24-1" 등)에 맞춰 폭으로도 제한 → 큰 결합석 코드가 박스를 넘지 않음
        const numFont = Math.min(s.h * 0.86, (s.w * 1.02) / estWidthEm(s.code), 20);
        // 그래도 넘치면 textLength로 압축(랜드마크 라벨과 동일한 잘림 방지)
        const codeAvail = s.w * 0.96;
        const codeTextLen = compressTextLength(s.code, numFont, codeAvail);

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
                x={s.x - 3}
                y={s.y - 3}
                width={s.w + 6}
                height={s.h + 6}
                rx={4.5}
                fill="none"
                stroke="#ec5e2e"
                strokeWidth={2}
                className="animate-pulse"
              />
            )}
            {!inactive && (
              <rect
                x={s.x + 1}
                y={s.y + 1.4}
                width={s.w}
                height={s.h}
                rx={3.5}
                fill="#3d2d22"
                opacity={assigned ? 0.2 : 0.11}
              />
            )}
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={3.5}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHighlight ? 1.6 : assigned ? 1.15 : 0.9}
            />
            {/* 나무매대 표시: 상단 브라운 바 */}
            {wood && !inactive && (
              <rect x={s.x + 1.8} y={s.y + 1.5} width={s.w - 3.6} height={2.4} rx={1.2} fill="#A9744F" />
            )}
            {/* 벤치/의자 구분 표식: 좌하단 점 (배정 좌석에서도 보이도록) */}
            {!inactive && s.palette !== "none" && (
              <circle cx={s.x + 3} cy={s.y + s.h - 3} r={2.1} fill={BENCH_SOLID[s.palette]} stroke="#ffffff" strokeWidth={0.9} />
            )}
            <text
              x={cx}
              y={cy}
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
          </g>
        );
      })}

      {/* 배정 셀러 티켓: 선 없이 좌석번호 칩과 상호명을 한 덩어리로 보여준다. */}
      {occupantLabels.map((label) => {
        const codeTextLength = compressTextLength(label.seatCode, 11.5, label.codeWidth - 7);
        return (
          <g key={`label-${label.key}`} style={{ pointerEvents: "none" }}>
            <title>{label.fullText}</title>
            <rect
              x={label.x + 1.4}
              y={label.y + 2}
              width={label.w}
              height={label.h}
              rx={7}
              fill="#3d2d22"
              opacity={0.13}
            />
            <rect
              x={label.x}
              y={label.y}
              width={label.w}
              height={label.h}
              rx={7}
              fill="#fffdfb"
              stroke="#ead7c4"
              strokeWidth={0.9}
            />
            <rect
              x={label.x + 3}
              y={label.y + 3}
              width={label.codeWidth}
              height={label.h - 6}
              rx={5}
              fill={label.color}
            />
            <text
              x={label.x + 3 + label.codeWidth / 2}
              y={label.y + label.h / 2}
              fontSize={11.5}
              fontWeight={900}
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="central"
              textLength={codeTextLength}
              lengthAdjust={codeTextLength ? "spacingAndGlyphs" : undefined}
              className="tnum"
            >
              {label.seatCode}
            </text>
            <text
              x={label.x + label.codeWidth + 11}
              y={label.y + label.h / 2}
              fontSize={16}
              fontWeight={850}
              fill="#2f2722"
              textAnchor="start"
              dominantBaseline="central"
              textLength={label.textLength}
              lengthAdjust={label.textLength ? "spacingAndGlyphs" : undefined}
            >
              {label.text}
            </text>
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

function layoutLandmarkText(
  label: string,
  kind: LandmarkKind,
  vertical: boolean,
  availLen: number,
  availThick: number,
): LandmarkTextLayout {
  const isStore = kind === "store";
  const minFont = isStore ? 10.5 : 9;
  const maxFont = isStore ? 24 : 22;

  if (vertical) {
    const rawFont = Math.min(availThick * 1.02, (availLen / estWidthEm(label)) * 1.02, maxFont);
    const fontSize = Math.max(minFont, rawFont);
    return {
      label,
      lines: [label],
      fontSize,
      lineHeight: fontSize * 1.12,
      textLengths: [fitTextLength(label, fontSize, availLen)],
    };
  }

  const maxLines = clamp(Math.floor(availThick / (isStore ? 15 : 13)), 1, 3);
  let best: LandmarkTextLayout | null = null;

  for (let count = 1; count <= maxLines; count++) {
    const lines = splitBalanced(label, count);
    const maxLineWidth = Math.max(...lines.map(estWidthEm));
    const fontSize = Math.min(maxFont, (availLen / maxLineWidth) * 0.98, availThick / (lines.length * 1.13));
    const score = fontSize * (lines.length === 1 ? 1 : 1.08);
    if (!best || score > best.fontSize * (best.lines.length === 1 ? 1 : 1.08)) {
      const finalFont = Math.max(minFont, fontSize);
      best = {
        label,
        lines,
        fontSize: finalFont,
        lineHeight: finalFont * 1.13,
        textLengths: lines.map((line) => fitTextLength(line, finalFont, availLen)),
      };
    }
  }

  return best ?? {
    label,
    lines: [label],
    fontSize: minFont,
    lineHeight: minFont * 1.13,
    textLengths: [fitTextLength(label, minFont, availLen)],
  };
}

function buildOccupantLabels(
  seats: SeatGeo[],
  states: Record<string, SeatCellState> | undefined,
): OccupantLabel[] {
  const labels = seats.flatMap((seat) => {
    const state = states?.[seat.code];
    const occupant = state?.status === "assigned" ? state.occupant : undefined;
    if (!occupant) return [];

    const bandBounds = seat.band === 1 ? BAND1_BOUNDS : BAND2_BOUNDS;
    const fontSize = 16;
    const codeWidth = clamp(estWidthEm(seat.code) * 11.5 + 12, 32, seat.code.includes(",") ? 76 : 48);
    const maxWidth = seat.code.includes(",") ? 340 : 300;
    const minWidth = seat.code.includes(",") ? 138 : 112;
    const text = occupant.business.replace(/\s+/g, " ").trim();
    const textWidth = estWidthEm(text) * fontSize;
    const w = clamp(textWidth + codeWidth + 24, minWidth, maxWidth);
    const h = 31;
    const anchorX = seat.x + seat.w / 2;
    const anchorY = seat.y + seat.h / 2;
    const side = labelSideFor(seat);
    const gap = 10;
    const x =
      side === "right"
        ? seat.x + seat.w + gap
        : side === "left"
          ? seat.x - w - gap
          : anchorX - w / 2;
    const y =
      side === "below"
        ? seat.y + seat.h + gap
        : side === "above"
          ? seat.y - h - gap
          : anchorY - h / 2;

    return [{
      key: seat.code,
      seatCode: seat.code,
      text,
      fullText: `${seat.code} · ${occupant.business} (${occupant.name})`,
      color: getCategory(occupant.categoryKey).color,
      codeWidth,
      x: clamp(x, bandBounds.x + 6, bandBounds.x + bandBounds.w - w - 6),
      y: clamp(y, bandBounds.y + 6, bandBounds.y + bandBounds.h - h - 6),
      w,
      h,
      anchorX,
      anchorY,
      textLength: fitTextLength(text, fontSize, w - codeWidth - 18),
    }];
  });

  return packOccupantLabels(labels);
}

function labelSideFor(seat: SeatGeo): "above" | "below" | "left" | "right" {
  if (seat.band === 1) {
    if (seat.y <= 130 && seat.x < 90) return "right";
    if (seat.y <= 130) return "below";
    if (seat.y >= 270) return "above";
    return seat.x < 120 ? "right" : "left";
  }
  if (seat.y <= 610) return "above";
  return "above";
}

function packOccupantLabels(labels: OccupantLabel[]): OccupantLabel[] {
  const groups = new Map<string, OccupantLabel[]>();
  for (const label of labels) {
    const lane = Math.round(label.y / 10) * 10;
    const key = `${lane}`;
    groups.set(key, [...(groups.get(key) ?? []), label]);
  }

  const packed: OccupantLabel[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      current.x = Math.max(current.x, prev.x + prev.w + 7);
    }

    const maxRight = Math.max(...sorted.map((l) => {
      const bounds = l.anchorY < BAND2_BOUNDS.y ? BAND1_BOUNDS : BAND2_BOUNDS;
      return bounds.x + bounds.w - 6;
    }));
    const overflow = Math.max(...sorted.map((l) => l.x + l.w)) - maxRight;
    if (overflow > 0) {
      for (const label of sorted) label.x -= overflow;
      for (let i = sorted.length - 2; i >= 0; i--) {
        const next = sorted[i + 1];
        const current = sorted[i];
        current.x = Math.min(current.x, next.x - current.w - 7);
      }
    }

    for (const label of sorted) {
      const bounds = label.anchorY < BAND2_BOUNDS.y ? BAND1_BOUNDS : BAND2_BOUNDS;
      label.x = clamp(label.x, bounds.x + 6, bounds.x + bounds.w - label.w - 6);
      packed.push(label);
    }
  }
  return packed;
}
