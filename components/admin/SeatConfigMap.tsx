"use client";

import { useMemo, useState } from "react";
import { TreePine, Ban, Check, Plus, MousePointerClick, Trash2, Link2, Unlink, BoxSelect } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VenueMapViewer } from "@/components/venue/VenueMapViewer";
import { StatusLegend } from "@/components/venue/Legend";
import { useStore } from "@/lib/data/hooks";
import { buildSeatStates } from "@/lib/data/selectors";
import { effectiveSeats, COMBO_SEATS, isComboSeat, splitParts } from "@/lib/venue/seats";
import { BAND1_MAX_Y } from "@/lib/venue/venue-layout";
import type { CustomSeat, EventConfig, Seller } from "@/lib/data/types";

type Mode = "edit" | "add" | "bulk";

export function SeatConfigMap({ event, sellers }: { event: EventConfig; sellers: Seller[] }) {
  const store = useStore();
  const [mode, setMode] = useState<Mode>("edit");
  const [selected, setSelected] = useState<string | null>(null);
  const [bulkRestore, setBulkRestore] = useState(false); // false=제외, true=다시 사용

  const states = useMemo(() => buildSeatStates(event, sellers), [event, sellers]);
  const effSeats = useMemo(() => effectiveSeats(event), [event]);

  const codesByNum = (a: number, b: number) =>
    effSeats.filter((s) => s.num >= a && s.num <= b).map((s) => s.code);
  const codesByBand = (band: 1 | 2) => effSeats.filter((s) => s.band === band).map((s) => s.code);
  const applyBulk = (codes: string[], active = bulkRestore) => store.setSeatsActive(event.id, codes, active);
  const seat = effSeats.find((s) => s.code === selected);
  const st = selected ? states[selected] : null;

  // 결합석 정보
  const isCombo = !!selected && isComboSeat(selected);
  const parentCombo = useMemo(
    () => (selected ? COMBO_SEATS.find((c) => splitParts(c.code).includes(selected)) : undefined),
    [selected],
  );
  const isCustom = !!seat && event.customSeats.some((c) => c.code === selected);

  function handleAdd(x: number, y: number) {
    const band: 1 | 2 = y < BAND1_MAX_Y ? 1 : 2;
    const n = event.customSeats.length + 1;
    const code = `추가${n}`;
    const seat: CustomSeat = { code, label: code, x: x - 12, y: y - 11, w: 24, h: 22, band, palette: "none" };
    store.addCustomSeat(event.id, seat);
    setSelected(code);
    setMode("edit");
  }

  const splitCount = event.splitSeatCodes.length;
  const inactiveCount = event.inactiveSeatCodes.length;
  const customCount = event.customSeats.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <ModeBtn active={mode === "edit"} onClick={() => setMode("edit")} icon={MousePointerClick}>
            좌석 선택·편집
          </ModeBtn>
          <ModeBtn active={mode === "add"} onClick={() => setMode("add")} icon={Plus}>
            좌석 추가 (지도 탭)
          </ModeBtn>
          <ModeBtn active={mode === "bulk"} onClick={() => setMode("bulk")} icon={BoxSelect}>
            일괄 제외 (드래그)
          </ModeBtn>
          {mode === "add" && (
            <span className="self-center text-xs font-medium text-coral-600">
              지도의 빈 곳을 탭하면 새 좌석이 생깁니다.
            </span>
          )}
        </div>

        {/* 일괄 제외 툴바 */}
        {mode === "bulk" && (
          <div className="mb-2 rounded-xl border border-cream-200 bg-cream-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-500">동작</span>
              <div className="flex overflow-hidden rounded-lg border border-cream-300">
                <button
                  onClick={() => setBulkRestore(false)}
                  className={"px-3 py-1 text-xs font-semibold " + (!bulkRestore ? "bg-rose-600 text-white" : "bg-white text-ink-500")}
                >
                  추첨 제외
                </button>
                <button
                  onClick={() => setBulkRestore(true)}
                  className={"px-3 py-1 text-xs font-semibold " + (bulkRestore ? "bg-teal-600 text-white" : "bg-white text-ink-500")}
                >
                  다시 사용
                </button>
              </div>
              <span className="text-xs text-ink-400">
                지도를 <b className="text-ink-600">드래그</b>해 영역 안 좌석을 {bulkRestore ? "복구" : "제외"}하세요.
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="self-center text-xs font-semibold text-ink-500">빠른 선택:</span>
              <BulkChip onClick={() => applyBulk(codesByNum(57, 80), false)}>57~80 제외</BulkChip>
              <BulkChip onClick={() => applyBulk(codesByNum(45, 80), false)}>45~80 제외</BulkChip>
              <BulkChip onClick={() => applyBulk(codesByBand(1), false)}>윗구간 제외</BulkChip>
              <BulkChip onClick={() => applyBulk(codesByBand(2), false)}>아랫구간 제외</BulkChip>
              <BulkChip onClick={() => store.updateEvent(event.id, { inactiveSeatCodes: [] })} tone="teal">
                전체 사용(초기화)
              </BulkChip>
            </div>
          </div>
        )}

        <VenueMapViewer
          states={states}
          seats={effSeats}
          highlightCode={selected}
          onSeatClick={mode === "edit" ? (code) => setSelected(code) : undefined}
          onMapClick={mode === "add" ? handleAdd : undefined}
          lasso={mode === "bulk"}
          onLasso={mode === "bulk" ? (codes) => applyBulk(codes) : undefined}
        />
        <div className="mt-3 rounded-xl border border-cream-200 bg-white p-3">
          <StatusLegend />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="제외" value={inactiveCount} suffix="석" />
          <Stat label="2매대 분리" value={splitCount} suffix="조" />
          <Stat label="추가" value={customCount} suffix="석" />
        </div>

        {/* 선택 좌석 편집 */}
        <div className="rounded-2xl border border-cream-200 bg-white p-4">
          <h4 className="text-sm font-bold text-ink-900">좌석 편집</h4>
          {!seat || !st ? (
            <p className="mt-2 text-sm text-ink-400">
              지도에서 좌석을 선택하세요. {mode === "add" && "(현재 추가 모드)"}
            </p>
          ) : (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-cream-100 px-2 font-black text-ink-900 tnum">
                  {seat.code}
                </span>
                <div className="text-xs text-ink-500">
                  <p>{seat.band === 1 ? "윗구간" : "아랫구간"}</p>
                  {st.status === "inactive" && <p className="text-rose-500">추첨 제외됨</p>}
                  {isCustom && <p className="text-teal-600">임의 추가 좌석</p>}
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {/* 2매대 결합석: 분리 */}
                {isCombo && (
                  <Button variant="outline" size="sm" onClick={() => store.setSeatSplit(event.id, seat.code, true)}>
                    <Unlink /> 2개 단독석으로 분리
                  </Button>
                )}
                {/* 분리된 단독석: 다시 붙임 */}
                {parentCombo && (
                  <Button variant="outline" size="sm" onClick={() => { store.setSeatSplit(event.id, parentCombo.code, false); setSelected(parentCombo.code); }}>
                    <Link2 /> 2매대로 다시 붙임 ({parentCombo.code})
                  </Button>
                )}

                {!isCustom && (
                  <Button
                    variant={st.type === "wood" ? "accent" : "outline"}
                    size="sm"
                    onClick={() => store.setSeatType(event.id, seat.code, st.type === "wood" ? "table" : "wood")}
                  >
                    <TreePine /> {st.type === "wood" ? "나무매대 해제" : "나무매대로 지정"}
                  </Button>
                )}

                <Button
                  variant={st.status === "inactive" ? "danger" : "outline"}
                  size="sm"
                  onClick={() => store.setSeatActive(event.id, seat.code, st.status === "inactive")}
                >
                  {st.status === "inactive" ? <Check /> : <Ban />}
                  {st.status === "inactive" ? "다시 사용 (추첨 포함)" : "추첨에서 제외"}
                </Button>

                {isCustom && (
                  <Button variant="ghost" size="sm" onClick={() => { store.removeCustomSeat(event.id, seat.code); setSelected(null); }}>
                    <Trash2 /> 이 추가 좌석 삭제
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2매대(결합석) 안내 */}
        <div className="rounded-2xl border border-cream-200 bg-white p-4">
          <h4 className="text-sm font-bold text-ink-900">2매대(붙임석)</h4>
          <p className="mt-1 text-xs text-ink-400">
            테이블 2개를 붙여 쓰는 자리입니다(최대 5팀). 당일 2매대 팀이 적으면 분리해서 단독석으로 추첨하세요.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COMBO_SEATS.map((c) => {
              const split = event.splitSeatCodes.includes(c.code);
              return (
                <button
                  key={c.code}
                  onClick={() => store.setSeatSplit(event.id, c.code, !split)}
                  className={
                    "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors " +
                    (split
                      ? "bg-cream-100 text-ink-400 line-through"
                      : "bg-coral-100 text-coral-700")
                  }
                  title={split ? "분리됨 — 클릭하여 붙임" : "붙임 — 클릭하여 분리"}
                >
                  {c.code}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-400">코랄=붙임(2매대) · 취소선=분리(단독 2석)</p>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Plus;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
        (active ? "bg-ink-900 text-cream-50" : "bg-cream-100 text-ink-500 hover:bg-cream-200")
      }
    >
      <Icon className="size-3.5" /> {children}
    </button>
  );
}

function BulkChip({
  onClick,
  tone = "rose",
  children,
}: {
  onClick: () => void;
  tone?: "rose" | "teal";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors " +
        (tone === "teal"
          ? "bg-teal-100 text-teal-700 hover:bg-teal-100/70"
          : "bg-white text-ink-700 ring-1 ring-cream-300 hover:bg-cream-100")
      }
    >
      {children}
    </button>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white p-2.5 text-center">
      <p className="text-lg font-extrabold text-ink-900 tnum">
        {value}
        <span className="text-xs font-bold text-ink-400">{suffix}</span>
      </p>
      <p className="text-[11px] text-ink-400">{label}</p>
    </div>
  );
}
