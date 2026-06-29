"use client";

import { useMemo, useState } from "react";
import { Search, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SeatMap } from "@/components/venue/SeatMap";
import { GpsGuide } from "@/components/venue/GpsGuide";
import { useAppData } from "@/lib/data/hooks";
import { buildSeatStates, searchSellers } from "@/lib/data/selectors";
import { effectiveSeats } from "@/lib/venue/seats";
import { getCategory } from "@/lib/venue/categories";
import { seatDirections } from "@/lib/venue/directions";
import type { Seller } from "@/lib/data/types";

export default function SellerPage() {
  const data = useAppData();
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchSellers(data.sellers, query), [data.sellers, query]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">내 자리 조회</h1>
        <p className="mt-1 text-sm text-ink-500">
          이름 또는 상호로 검색하면 선정 여부와 배정된 자리를 확인할 수 있어요.
        </p>

        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
          <Input
            autoFocus
            placeholder="이름 · 상호 검색 (예: 김은미, 만달)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 text-base"
          />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {query.trim() && results.length === 0 && (
            <p className="rounded-xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-400">
              검색 결과가 없습니다. 이름/상호를 다시 확인해 주세요.
            </p>
          )}
          {results.map((s) => (
            <SellerCard key={s.id} seller={s} data={data} />
          ))}
        </div>
      </main>
    </>
  );
}

function SellerCard({ seller, data }: { seller: Seller; data: ReturnType<typeof useAppData> }) {
  const event = data.events.find((e) => e.id === seller.eventId);
  const cat = getCategory(seller.categoryKey);
  const assigned = !!seller.assignedSeat;
  const dir = assigned ? seatDirections(seller.assignedSeat!) : null;
  const band = dir?.band === 2 ? "band2" : "band1";
  const states = useMemo(
    () => buildSeatStates(event, data.sellers.filter((x) => x.eventId === seller.eventId)),
    [event, data.sellers, seller.eventId],
  );
  const effSeats = useMemo(() => effectiveSeats(event), [event]);

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-ink-900">{seller.business}</h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: cat.color }}
            >
              {cat.label}
            </span>
          </div>
          <p className="text-sm text-ink-400">{seller.name}</p>
        </div>
        <Badge variant="neutral">{event?.weekday ?? "?"}요일 · {event?.name?.includes("비비") ? "비비데이" : "플리마켓"}</Badge>
      </div>

      {assigned ? (
        <div className="border-t border-cream-100">
          <div className="flex items-center gap-4 bg-coral-50 px-5 py-4">
            <div
              className="flex size-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl px-1 text-center text-white"
              style={{ backgroundColor: cat.color }}
            >
              <span className="text-[10px] font-semibold opacity-90">내 자리</span>
              <span
                className={
                  "font-black leading-none tnum " +
                  ((seller.assignedSeat?.length ?? 0) > 5
                    ? "text-sm"
                    : (seller.assignedSeat?.length ?? 0) > 2
                      ? "text-lg"
                      : "text-2xl")
                }
              >
                {seller.assignedSeat}
              </span>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-teal-600">
                <CheckCircle2 className="size-4" /> 자리 배정 완료
              </p>
              {dir && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-700">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-coral-600" />
                  {dir.text}
                </p>
              )}
            </div>
          </div>
          <div className="px-5 pb-1">
            <GpsGuide />
          </div>
          <div className="p-3">
            <div style={{ aspectRatio: band === "band1" ? 3.29 : 1.63 }} className="w-full">
              <SeatMap view={band} states={states} seats={effSeats} highlightCode={seller.assignedSeat} />
            </div>
            <p className="px-1 pt-2 text-xs text-ink-400">
              빨간 테두리가 내 자리입니다. 현장에서 안내 표지판과 함께 확인하세요.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-cream-100 bg-cream-50 px-5 py-4 text-sm text-ink-500">
          <Clock className="size-4 text-gold-500" />
          아직 추첨 전입니다. 현장에서 추첨 후 이 화면에서 자리를 확인하세요.
        </div>
      )}
    </div>
  );
}
