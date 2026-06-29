"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  MapPinned,
  CalendarCog,
  LogOut,
  Download,
  RotateCcw,
  Plus,
  Play,
  Hand,
  Armchair,
  Music,
  Users2,
  StickyNote,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { NotesPanel } from "@/components/admin/NotesPanel";
import { effectiveSeats } from "@/lib/venue/seats";
import { seatNeedsChair } from "@/lib/venue/bench";
import { buskingForDate, STAGE_FRONT_SEATS } from "@/lib/data/busking";
import { staffForDate } from "@/lib/data/staff";
import { AdminGate, adminLogout } from "@/components/admin/AdminGate";
import { UploadCard } from "@/components/admin/UploadCard";
import { RosterTable } from "@/components/admin/RosterTable";
import { SeatConfigMap } from "@/components/admin/SeatConfigMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { VenueMapViewer } from "@/components/venue/VenueMapViewer";
import { useAppData, useStore } from "@/lib/data/hooks";
import { buildSeatStates, lotteryProgress } from "@/lib/data/selectors";
import type { EventConfig, EventType, Seller, Weekday } from "@/lib/data/types";

type Tab = "overview" | "roster" | "seats" | "notes" | "event";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "overview", label: "현황", icon: LayoutDashboard },
  { key: "roster", label: "명단", icon: Users },
  { key: "seats", label: "자리 설정", icon: MapPinned },
  { key: "notes", label: "메모", icon: StickyNote },
  { key: "event", label: "행사", icon: CalendarCog },
];

const STATUS_FLOW: { value: EventConfig["status"]; label: string }[] = [
  { value: "draft", label: "준비중" },
  { value: "lottery_open", label: "추첨 진행" },
  { value: "lottery_closed", label: "추첨 마감" },
  { value: "completed", label: "완료" },
];

function AdminInner() {
  const data = useAppData();
  const store = useStore();
  const [tab, setTab] = useState<Tab>("overview");

  const event = data.events.find((e) => e.id === data.currentEventId) ?? data.events[0];
  const sellers = useMemo(
    () => (event ? data.sellers.filter((s) => s.eventId === event.id).sort((a, b) => a.seq - b.seq) : []),
    [data.sellers, event],
  );
  const openNotes = event ? data.notes.filter((n) => n.eventId === event.id && !n.done).length : 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      {/* 상단 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select
            value={event?.id ?? ""}
            onChange={(e) => store.setCurrentEvent(e.target.value)}
            className="w-auto font-semibold"
          >
            {data.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
            {data.events.length === 0 && <option>행사 없음</option>}
          </Select>
          {event && <StatusControl event={event} />}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { adminLogout(); location.reload(); }}>
          <LogOut /> 로그아웃
        </Button>
      </div>

      {/* 탭 */}
      <div className="mt-5 flex gap-1 border-b border-cream-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors " +
              (tab === t.key
                ? "border-coral-500 text-coral-600"
                : "border-transparent text-ink-400 hover:text-ink-700")
            }
          >
            <t.icon className="size-4" /> {t.label}
            {t.key === "notes" && openNotes > 0 && (
              <span className="ml-0.5 rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-white tnum">
                {openNotes}
              </span>
            )}
          </button>
        ))}
      </div>

      {!event ? (
        <NoEvent />
      ) : (
        <div className="mt-6">
          {tab === "overview" && <Overview event={event} sellers={sellers} />}
          {tab === "roster" && (
            <div className="flex flex-col gap-5">
              <UploadCard eventId={event.id} />
              <RosterTable event={event} sellers={sellers} />
            </div>
          )}
          {tab === "seats" && <SeatConfigMap event={event} sellers={sellers} />}
          {tab === "notes" && <NotesPanel eventId={event.id} />}
          {tab === "event" && <EventSettings event={event} />}
        </div>
      )}
    </main>
  );
}

function StatusControl({ event }: { event: EventConfig }) {
  const store = useStore();
  const idx = STATUS_FLOW.findIndex((s) => s.value === event.status);
  const next = STATUS_FLOW[idx + 1];
  const variant: Record<string, "neutral" | "coral" | "gold" | "teal"> = {
    draft: "neutral",
    lottery_open: "coral",
    lottery_closed: "gold",
    completed: "teal",
  };
  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant[event.status]}>● {STATUS_FLOW[idx]?.label}</Badge>
      {next && (
        <Button size="sm" variant="outline" onClick={() => store.updateEvent(event.id, { status: next.value })}>
          <Play className="size-3.5" /> {next.label}
        </Button>
      )}
    </div>
  );
}

function Overview({ event, sellers }: { event: EventConfig; sellers: Seller[] }) {
  const data = useAppData();
  const store = useStore();
  const states = useMemo(() => buildSeatStates(event, sellers), [event, sellers]);
  const effSeats = useMemo(() => effectiveSeats(event), [event]);
  const progress = lotteryProgress(sellers);
  const chairsNeeded = useMemo(() => {
    const inactive = new Set(event.inactiveSeatCodes);
    return effSeats.filter((s) => !inactive.has(s.code) && seatNeedsChair(s.palette)).length;
  }, [effSeats, event.inactiveSeatCodes]);
  const busking = buskingForDate(event.date);
  const staff = staffForDate(event.date);
  const stageFrontExcluded = STAGE_FRONT_SEATS.every((c) => event.inactiveSeatCodes.includes(c));
  const draws = data.draws
    .filter((d) => d.eventId === event.id)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      {/* 버스킹 알림 */}
      {busking.length > 0 && (
        <div className="rounded-2xl border border-[#e9d5b0] bg-[#fff8ec] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-400 text-white">
                <Music className="size-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-ink-900">이 날 버스킹 공연이 있습니다</p>
                <ul className="mt-1 space-y-0.5 text-sm text-ink-600">
                  {busking.map((b, i) => (
                    <li key={i}>
                      <span className="font-semibold">{b.time}</span> · {b.title}
                      {b.performer ? ` — ${b.performer}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-ink-400">
                  무대 앞 좌석(27~29 · 57~59)은 공연 진행을 위해 제외하는 것을 권장합니다.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={stageFrontExcluded ? "ghost" : "primary"}
              onClick={() => {
                const exclude = !stageFrontExcluded;
                STAGE_FRONT_SEATS.forEach((c) => store.setSeatActive(event.id, c, !exclude));
              }}
            >
              {stageFrontExcluded ? "무대 앞 제외 해제" : "무대 앞 6석 제외하기"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <VenueMapViewer states={states} seats={effSeats} showOccupantNames />
        </div>
      <div className="flex flex-col gap-4">
        <Link href="/kiosk">
          <Button size="lg" className="w-full">
            <Hand /> 추첨 화면 열기
          </Button>
        </Link>
        <div className="rounded-2xl border border-cream-200 bg-white p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-extrabold text-ink-900 tnum">
                {progress.drawn}
                <span className="text-lg font-bold text-ink-400">/{progress.total}</span>
              </p>
              <p className="text-xs text-ink-400">자리 배정 완료</p>
            </div>
            <div className="text-right text-xs text-ink-400">
              <p>나무 {event.countWood} · 테이블 {event.countTable}</p>
              <p>의자 {event.countChair}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-600">
            <Armchair className="size-4" /> 의자 지급 필요 {chairsNeeded}석
            <span className="font-normal text-ink-400">(벤치 없는 사용 좌석)</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-coral-500 transition-all"
              style={{ width: `${progress.total ? (progress.drawn / progress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCsv(event, sellers)}>
              <Download /> 결과 내보내기
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("이 행사의 모든 추첨 결과를 초기화할까요?")) store.resetDraws(event.id);
              }}
            >
              <RotateCcw /> 추첨 초기화
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-cream-200 bg-white p-4">
          <h4 className="text-sm font-bold text-ink-900">최근 활동</h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {draws.length === 0 && <li className="text-sm text-ink-400">아직 활동이 없습니다.</li>}
            {draws.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-ink-700">{d.sellerName}</span>
                <span className="ml-2 shrink-0 font-semibold text-ink-400">
                  {d.seatCode ? `${d.seatCode}번` : "—"} · {actionLabel(d.action)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 오늘 근무 */}
        <div className="rounded-2xl border border-cream-200 bg-white p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <Users2 className="size-4 text-coral-500" /> 오늘 근무
          </h4>
          {staff.length === 0 ? (
            <p className="mt-2 text-sm text-ink-400">등록된 근무자가 없습니다 ({event.date}).</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {staff.map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-1 text-xs font-semibold text-ink-700"
                >
                  {m.name}
                  {m.role && <span className="font-normal text-ink-400">{m.role}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function EventSettings({ event }: { event: EventConfig }) {
  const store = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-2xl border border-cream-200 bg-white p-5">
        <h3 className="font-bold text-ink-900">행사 정보</h3>
        <div className="mt-4 flex flex-col gap-3">
          <Field label="행사명">
            <Input value={event.name} onChange={(e) => store.updateEvent(event.id, { name: e.target.value })} />
          </Field>
          <Field label="날짜">
            <Input
              type="date"
              value={event.date}
              onChange={(e) => store.updateEvent(event.id, { date: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="요일">
              <Select
                value={event.weekday}
                onChange={(e) => store.updateEvent(event.id, { weekday: e.target.value as Weekday })}
              >
                {(["금", "토", "일"] as Weekday[]).map((w) => (
                  <option key={w} value={w}>{w}요일</option>
                ))}
              </Select>
            </Field>
            <Field label="유형">
              <Select
                value={event.eventType}
                onChange={(e) => store.updateEvent(event.id, { eventType: e.target.value as EventType })}
              >
                <option value="fleamarket">플리마켓</option>
                <option value="bbday">비비데이</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="나무매대">
              <Input type="number" value={event.countWood} onChange={(e) => store.updateEvent(event.id, { countWood: +e.target.value })} />
            </Field>
            <Field label="테이블">
              <Input type="number" value={event.countTable} onChange={(e) => store.updateEvent(event.id, { countTable: +e.target.value })} />
            </Field>
            <Field label="의자">
              <Input type="number" value={event.countChair} onChange={(e) => store.updateEvent(event.id, { countChair: +e.target.value })} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-cream-200 bg-white p-5">
          <h3 className="font-bold text-ink-900">새 행사</h3>
          <p className="mt-1 text-sm text-ink-400">금·토·일 각각, 또는 비비데이 등 행사를 추가합니다.</p>
          {creating ? (
            <NewEventForm onDone={() => setCreating(false)} />
          ) : (
            <Button className="mt-3" variant="outline" onClick={() => setCreating(true)}>
              <Plus /> 행사 추가
            </Button>
          )}
        </div>
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-5">
          <h3 className="font-bold text-ink-900">데모 초기화</h3>
          <p className="mt-1 text-sm text-ink-400">시드 데이터(샘플 명단)로 전체를 되돌립니다.</p>
          <Button
            className="mt-3"
            variant="ghost"
            onClick={() => {
              if (confirm("모든 행사·명단·추첨을 시드 상태로 되돌릴까요?")) store.resetAll();
            }}
          >
            <RotateCcw /> 시드로 초기화
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewEventForm({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const [date, setDate] = useState("");
  const [weekday, setWeekday] = useState<Weekday>("토");
  const [type, setType] = useState<EventType>("fleamarket");
  return (
    <div className="mt-3 flex flex-col gap-3">
      <Field label="날짜">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="요일">
          <Select value={weekday} onChange={(e) => setWeekday(e.target.value as Weekday)}>
            {(["금", "토", "일"] as Weekday[]).map((w) => (
              <option key={w} value={w}>{w}요일</option>
            ))}
          </Select>
        </Field>
        <Field label="유형">
          <Select value={type} onChange={(e) => setType(e.target.value as EventType)}>
            <option value="fleamarket">플리마켓</option>
            <option value="bbday">비비데이</option>
          </Select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            store.createEvent({ date: date || "2026-07-05", weekday, eventType: type });
            onDone();
          }}
        >
          만들기
        </Button>
        <Button variant="ghost" onClick={onDone}>
          취소
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NoEvent() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-cream-300 bg-white py-16 text-center">
      <p className="font-bold text-ink-700">행사가 없습니다</p>
      <p className="mt-1 text-sm text-ink-400">행사 탭에서 새 행사를 만들어 시작하세요.</p>
    </div>
  );
}

function actionLabel(a: string): string {
  return (
    { draw: "추첨", redraw: "재추첨", reassign: "이동", swap: "교환", deactivate: "취소", reset: "초기화" } as Record<string, string>
  )[a] ?? a;
}

function exportCsv(event: EventConfig, sellers: Seller[]) {
  const rows = [
    ["번호", "상호", "이름", "취급상품", "배정자리"],
    ...sellers.map((s) => [
      String(s.seq),
      s.business,
      s.name,
      s.productText,
      s.assignedSeat ?? "",
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.name}_자리배정.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  return (
    <>
      <Header />
      <AdminGate>
        <AdminInner />
      </AdminGate>
    </>
  );
}
