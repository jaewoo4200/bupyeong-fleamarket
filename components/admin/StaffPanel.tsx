"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Users2, AlertTriangle, ArrowDownToLine, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useStore } from "@/lib/data/hooks";
import { STAFF_PROMPT, parseStaffText, upsertByDate } from "@/lib/data/schedule-parse";
import type { StaffEntry } from "@/lib/data/types";
import { SchedulePromptBox } from "./SchedulePromptBox";
import { SaveBar } from "./BuskingPanel";
import { MonthBar } from "./MonthBar";

function newId() {
  return "stf_" + Math.random().toString(36).slice(2, 10);
}
const cell = "h-9 rounded-lg border border-cream-300 bg-white px-2.5 text-sm text-ink-900 focus-visible:border-coral-400 focus-visible:outline-none";

function weekdayKo(date: string): string {
  // 의존성 없이 요일 계산 (Zeller 유사) — 표시용
  const [yy, mm, dd] = date.split("-").map(Number);
  if (!yy || !mm || !dd) return "";
  let y = yy, m = mm;
  if (m < 3) { m += 12; y -= 1; }
  const k = y % 100, j = Math.floor(y / 100);
  const h = (dd + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return ["토", "일", "월", "화", "수", "목", "금"][h];
}

export function StaffPanel({ entries, defaultDate }: { entries: StaffEntry[]; defaultDate?: string }) {
  const store = useStore();
  const [draft, setDraft] = useState<StaffEntry[]>(entries);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(entries);
  }, [entries, dirty]);

  const [text, setText] = useState("");
  const init = defaultDate ?? "2026-06-01";
  const [ym, setYm] = useState(init.slice(0, 7));
  const [showAll, setShowAll] = useState(false);
  const [newDate, setNewDate] = useState(init);
  const [y, mo] = ym.split("-").map(Number);
  const parsed = useMemo(() => parseStaffText(text, { defaultYear: y, defaultMonth: mo }), [text, y, mo]);

  const mark = (updater: (d: StaffEntry[]) => StaffEntry[]) => {
    setDraft(updater);
    setDirty(true);
  };
  const editPerson = (id: string, patch: Partial<StaffEntry>) => mark((d) => d.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removePerson = (id: string) => mark((d) => d.filter((e) => e.id !== id));
  const addPerson = (date: string) => mark((d) => [...d, { id: newId(), date, name: "", role: "" }]);
  const removeDate = (date: string) => mark((d) => d.filter((e) => e.date !== date));
  const doImport = () => {
    mark((d) => upsertByDate(d, parsed.entries));
    setText("");
  };
  const save = async () => {
    try {
      // await: Supabase 어댑터에서 저장 완료 전 dirty를 끄면 stale entries로 잠깐 되돌아가는 깜빡임 방지
      await store.setStaffEntries([...draft].sort((a, b) => a.date.localeCompare(b.date)));
      setDirty(false);
    } catch (e) {
      alert("저장에 실패했습니다. 다시 시도해 주세요.\n" + (e instanceof Error ? e.message : ""));
    }
  };
  const revert = () => {
    setDraft(entries);
    setDirty(false);
  };

  const allGroups = useMemo(() => {
    const m = new Map<string, StaffEntry[]>();
    for (const e of draft) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [draft]);
  const groups = useMemo(
    () => (showAll ? allGroups : allGroups.filter(([date]) => date.startsWith(ym))),
    [allGroups, showAll, ym],
  );
  const visiblePeople = groups.reduce((n, [, ps]) => n + ps.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <SchedulePromptBox prompt={STAFF_PROMPT} kind="근무자" />

      <MonthBar ym={ym} setYm={setYm} showAll={showAll} setShowAll={setShowAll} count={groups.length} totalCount={allGroups.length} unit="일" />

      {/* 붙여넣기 → 미리보기 → 가져오기 */}
      <div className="rounded-2xl border border-cream-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1">
            <Label>AI 결과 붙여넣기</Label>
            <p className="mt-0.5 text-xs text-ink-400">형식: 날짜 | 근무자(쉼표 구분, 직책은 이름 뒤 공백) · 날짜가 M/D면 위 “{ym}” 기준 보정</p>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"2026-06-03 | 안재훈 부장, 신철용 대리, 이재원"}
          className="mt-2 w-full resize-y rounded-xl border border-cream-300 bg-white p-3 font-mono text-xs text-ink-900 placeholder:text-ink-300 focus-visible:border-coral-400 focus-visible:outline-none"
        />
        {text.trim() && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-teal-700">
              {parsed.dates.length}일 · {parsed.entries.length}명 인식
            </span>
            {parsed.issues.length > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <AlertTriangle className="size-3.5" /> {parsed.issues.length}줄 확인 필요
              </span>
            )}
            <Button size="sm" className="ml-auto" disabled={parsed.entries.length === 0} onClick={doImport}>
              <ArrowDownToLine /> 가져오기(해당 날짜 덮어쓰기)
            </Button>
          </div>
        )}
        {text.trim() && parsed.issues.length > 0 && (
          <ul className="mt-2 space-y-0.5 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">
            {parsed.issues.slice(0, 5).map((is, i) => (
              <li key={i}>
                {is.line}줄: {is.message} <span className="text-rose-400">— “{is.raw}”</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 편집 목록 (날짜별) */}
      <div className="rounded-2xl border border-cream-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <Users2 className="size-4 text-coral-600" />{" "}
            {showAll ? "근무자 (전체)" : `근무자 · ${+ym.slice(5, 7)}월`} ({groups.length}일 · {visiblePeople}명)
          </h4>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9 w-40" />
            <Button size="sm" variant="outline" onClick={() => addPerson(newDate)}>
              <CalendarPlus /> 날짜 추가
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="mt-3 rounded-lg bg-cream-50 px-3 py-6 text-center text-sm text-ink-400">
            {showAll ? "등록된" : `${+ym.slice(5, 7)}월에 등록된`} 근무자가 없습니다. 위에서 사진→텍스트로 가져오거나 “날짜 추가”를 누르세요.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {groups.map(([date, people]) => (
              <div key={date} className="rounded-xl border border-cream-200 bg-cream-50 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-ink-800">
                    {date} <span className="font-semibold text-ink-400">({weekdayKo(date)})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => addPerson(date)}>
                      <Plus /> 근무자
                    </Button>
                    <button onClick={() => removeDate(date)} className="grid size-8 place-items-center rounded-lg text-ink-300 hover:bg-rose-50 hover:text-rose-500" aria-label="이 날 전체 삭제">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {people.map((p) => (
                    <div key={p.id} className="grid grid-cols-[1fr_7rem_auto] items-center gap-1.5">
                      <input value={p.name} placeholder="이름" onChange={(ev) => editPerson(p.id, { name: ev.target.value })} className={cell} />
                      <input value={p.role ?? ""} placeholder="직책(선택)" onChange={(ev) => editPerson(p.id, { role: ev.target.value })} className={cell} />
                      <button onClick={() => removePerson(p.id)} className="grid size-8 place-items-center rounded-lg text-ink-300 hover:bg-rose-50 hover:text-rose-500" aria-label="삭제">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dirty && <SaveBar onSave={save} onRevert={revert} />}
    </div>
  );
}
