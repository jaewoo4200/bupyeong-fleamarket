"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Hand, ArrowRight, Sparkles } from "lucide-react";
import { Header } from "@/components/site/Header";
import { AdminGate } from "@/components/admin/AdminGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SeatRoulette } from "@/components/lottery/SeatRoulette";
import { SeatMap } from "@/components/venue/SeatMap";
import { effectiveSeats } from "@/lib/venue/seats";
import { cn } from "@/lib/ui/cn";

/** 좌석 코드 길이에 따른 큰 글자 크기 */
function seatFontClass(code: string): string {
  if (code.length > 5) return "text-3xl";
  if (code.length > 2) return "text-5xl";
  return "text-7xl";
}
import { useStore, useCurrentEvent, useSellers } from "@/lib/data/hooks";
import { buildSeatStates, lotteryProgress } from "@/lib/data/selectors";
import { getCategory } from "@/lib/venue/categories";
import { seatDirections } from "@/lib/venue/directions";
import type { DrawResult, Seller } from "@/lib/data/types";

type Phase = "select" | "ready" | "drawing" | "revealed";

function KioskInner() {
  const store = useStore();
  const event = useCurrentEvent();
  const sellers = useSellers(event?.id);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Seller | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [result, setResult] = useState<DrawResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = lotteryProgress(sellers);
  const undrawn = useMemo(
    () =>
      sellers
        .filter((s) => !s.assignedSeat)
        .filter((s) => {
          const q = query.trim().toLowerCase().replace(/\s/g, "");
          if (!q) return true;
          return `${s.name}${s.business}${s.seq}`.toLowerCase().replace(/\s/g, "").includes(q);
        }),
    [sellers, query],
  );
  const states = useMemo(() => buildSeatStates(event, sellers), [event, sellers]);
  const effSeats = useMemo(() => effectiveSeats(event), [event]);

  // 선택된 셀러의 실시간 상태(추첨 후 assignedSeat 반영)
  const selectedLive = selected ? sellers.find((s) => s.id === selected.id) ?? selected : null;

  function startDraw() {
    if (!event || !selected) return;
    setError(null);
    setPhase("drawing");
    let res: DrawResult | null = null;
    try {
      res = store.drawSeat(event.id, selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추첨 실패");
      setPhase("ready");
      return;
    }
    // 룰렛 연출 후 공개
    setTimeout(() => {
      setResult(res);
      setPhase("revealed");
    }, 1800);
  }

  function reset() {
    setSelected(null);
    setResult(null);
    setPhase("select");
    setQuery("");
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-20 text-center">
        <p className="text-lg font-bold text-ink-700">진행 중인 행사가 없습니다</p>
        <p className="mt-1 text-sm text-ink-400">관리자 화면에서 행사를 만들고 명단을 업로드하세요.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-coral-600">자리 추첨</p>
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">{event.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-ink-900 tnum">
            {progress.drawn}
            <span className="text-sm font-bold text-ink-400">/{progress.total}</span>
          </p>
          <p className="text-xs text-ink-400">완료</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* 1. 셀러 선택 */}
        {phase === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
              <Input
                autoFocus
                placeholder="번호·상호·이름으로 셀러 찾기"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {undrawn.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-cream-300 bg-white py-14 text-center">
                <Sparkles className="mx-auto size-7 text-teal-500" />
                <p className="mt-2 font-bold text-ink-700">모든 셀러의 추첨이 끝났어요!</p>
                <p className="mt-1 text-sm text-ink-400">추첨 현황은 현황판에서 확인하세요.</p>
              </div>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {undrawn.map((s) => {
                  const cat = getCategory(s.categoryKey);
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setSelected(s);
                          setPhase("ready");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-cream-200 bg-white p-3 text-left shadow-soft transition-colors hover:border-coral-300 hover:bg-coral-50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-sm font-bold text-ink-500 tnum">
                          {s.seq}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-ink-900">{s.business}</span>
                          <span className="block truncate text-xs text-ink-400">{s.name}</span>
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}

        {/* 2/3. 뽑기 + 룰렛 */}
        {(phase === "ready" || phase === "drawing") && selectedLive && (
          <motion.div
            key="draw"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 flex flex-col items-center text-center"
          >
            <Badge variant="coral">{selectedLive.seq}번 셀러</Badge>
            <h2 className="mt-3 text-2xl font-extrabold text-ink-900">{selectedLive.business}</h2>
            <p className="text-ink-400">{selectedLive.name}</p>

            <motion.div
              animate={phase === "drawing" ? { rotate: [0, -5, 5, -4, 4, 0] } : {}}
              transition={{ repeat: phase === "drawing" ? Infinity : 0, duration: 0.6 }}
              className="mt-8 flex size-56 flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border-4 border-coral-200 bg-gradient-to-b from-coral-50 to-white px-3 shadow-pop"
            >
              <span className="text-xs font-semibold text-ink-400">추첨 번호</span>
              <SeatRoulette
                running={phase === "drawing"}
                final={null}
                className="text-6xl font-black leading-none text-coral-600"
              />
            </motion.div>

            {error && <p className="mt-4 text-sm font-semibold text-rose-500">{error}</p>}

            <div className="mt-8 flex gap-3">
              {phase === "ready" && (
                <>
                  <Button variant="ghost" onClick={reset}>
                    뒤로
                  </Button>
                  <Button size="lg" onClick={startDraw}>
                    <Hand /> 자리 뽑기
                  </Button>
                </>
              )}
              {phase === "drawing" && (
                <p className="animate-pulse text-sm font-semibold text-ink-400">뽑는 중…</p>
              )}
            </div>
          </motion.div>
        )}

        {/* 4. 결과 공개 */}
        {phase === "revealed" && result && selectedLive && (
          <RevealCard result={result} seller={selectedLive} states={states} seats={effSeats} onNext={reset} />
        )}
      </AnimatePresence>
    </main>
  );
}

function RevealCard({
  result,
  seller,
  states,
  seats,
  onNext,
}: {
  result: DrawResult;
  seller: Seller;
  states: Record<string, ReturnType<typeof buildSeatStates>[string]>;
  seats: ReturnType<typeof effectiveSeats>;
  onNext: () => void;
}) {
  const cat = getCategory(seller.categoryKey);
  const dir = seatDirections(result.seatCode);
  const band = dir?.band === 2 ? "band2" : "band1";

  return (
    <motion.div
      key="revealed"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex flex-col items-center text-center"
    >
      <p className="text-lg font-extrabold text-coral-600">🎉 추첨 완료</p>
      <Badge variant="neutral" className="mt-1.5">
        {seller.seq}번 셀러
      </Badge>

      {/* 흰 티켓 — 좌석 번호 분리(임팩트) */}
      <motion.div
        initial={{ scale: 0.6, rotate: -6 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className="relative mt-5 w-60 overflow-hidden rounded-[2rem] bg-white shadow-pop"
      >
        <div className="h-2 w-full" style={{ backgroundColor: cat.color }} />
        <div className="flex flex-col items-center px-4 py-6">
          <span className="text-sm font-semibold text-ink-400">배정 좌석</span>
          <span
            className={cn("font-black leading-none tracking-tight text-ink-900 tnum", seatFontClass(result.seatCode))}
          >
            {result.seatCode}
          </span>
          <span
            className="mt-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ backgroundColor: cat.color }}
          >
            {cat.label}
          </span>
        </div>
      </motion.div>

      <h2 className="mt-6 text-2xl font-extrabold text-ink-900">{seller.business}</h2>
      <p className="text-ink-500">{seller.name}</p>

      {dir && (
        <p className="mt-4 max-w-md rounded-xl bg-cream-100 px-4 py-2.5 text-sm font-medium text-ink-700">
          📍 {dir.text}
        </p>
      )}

      <div className="mt-5 w-full max-w-xl overflow-hidden rounded-2xl border border-cream-200 bg-white p-2">
        <div style={{ aspectRatio: band === "band1" ? 3.29 : 1.63 }}>
          <SeatMap view={band} states={states} seats={seats} highlightCode={result.seatCode} />
        </div>
      </div>

      <Button size="lg" className="mt-7" onClick={onNext}>
        다음 셀러 <ArrowRight />
      </Button>
    </motion.div>
  );
}

export default function KioskPage() {
  return (
    <>
      <Header />
      <AdminGate>
        <KioskInner />
      </AdminGate>
    </>
  );
}
