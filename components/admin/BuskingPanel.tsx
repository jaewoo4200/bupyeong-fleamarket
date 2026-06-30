"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Undo2, Music, AlertTriangle, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useStore } from "@/lib/data/hooks";
import { BUSKING_PROMPT, parseBuskingText, upsertByDate } from "@/lib/data/schedule-parse";
import type { BuskingEntry } from "@/lib/data/types";
import { SchedulePromptBox } from "./SchedulePromptBox";

function newId() {
  return "bsk_" + Math.random().toString(36).slice(2, 10);
}
const byDate = (a: BuskingEntry, b: BuskingEntry) =>
  a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "");

const cell = "h-9 rounded-lg border border-cream-300 bg-white px-2.5 text-sm text-ink-900 focus-visible:border-coral-400 focus-visible:outline-none";

export function BuskingPanel({ entries, defaultDate }: { entries: BuskingEntry[]; defaultDate?: string }) {
  const store = useStore();
  const [draft, setDraft] = useState<BuskingEntry[]>(entries);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(entries);
  }, [entries, dirty]);

  const [text, setText] = useState("");
  const init = defaultDate ?? "2026-06-01";
  const [ym, setYm] = useState(init.slice(0, 7));
  const [y, mo] = ym.split("-").map(Number);
  const parsed = useMemo(
    () => parseBuskingText(text, { defaultYear: y, defaultMonth: mo }),
    [text, y, mo],
  );

  const edit = (id: string, patch: Partial<BuskingEntry>) => {
    setDraft((d) => d.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setDirty(true);
  };
  const remove = (id: string) => {
    setDraft((d) => d.filter((e) => e.id !== id));
    setDirty(true);
  };
  const addRow = () => {
    setDraft((d) => [...d, { id: newId(), date: init, time: "", title: "", performer: "", contact: "" }]);
    setDirty(true);
  };
  const doImport = () => {
    setDraft((d) => upsertByDate(d, parsed.entries));
    setDirty(true);
    setText("");
  };
  const save = async () => {
    try {
      // await: Supabase 어댑터에서 저장 완료 전 dirty를 끄면 stale entries로 잠깐 되돌아가는 깜빡임 방지
      await store.setBuskingEntries([...draft].sort(byDate));
      setDirty(false);
    } catch (e) {
      alert("저장에 실패했습니다. 다시 시도해 주세요.\n" + (e instanceof Error ? e.message : ""));
    }
  };
  const revert = () => {
    setDraft(entries);
    setDirty(false);
  };

  const sorted = useMemo(() => [...draft].sort(byDate), [draft]);

  return (
    <div className="flex flex-col gap-5">
      <SchedulePromptBox prompt={BUSKING_PROMPT} kind="버스킹" />

      {/* 붙여넣기 → 미리보기 → 가져오기 */}
      <div className="rounded-2xl border border-cream-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1">
            <Label>AI 결과 붙여넣기</Label>
            <p className="mt-0.5 text-xs text-ink-400">형식: 날짜 | 시간 | 공연명 | 공연자 | 연락처</p>
          </div>
          <div className="w-40">
            <Label>기준 연·월</Label>
            <Input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="h-9" />
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"2026-06-07 | 17:30~19:30 | 보컬그룹(3인) 발라드 | 민재봉 | 010-2418-9497"}
          className="mt-2 w-full resize-y rounded-xl border border-cream-300 bg-white p-3 font-mono text-xs text-ink-900 placeholder:text-ink-300 focus-visible:border-coral-400 focus-visible:outline-none"
        />
        {text.trim() && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-teal-700">{parsed.entries.length}건 인식</span>
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

      {/* 편집 목록 */}
      <div className="rounded-2xl border border-cream-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <Music className="size-4 text-gold-500" /> 버스킹 일정 ({sorted.length})
          </h4>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus /> 일정 추가
          </Button>
        </div>

        {sorted.length === 0 ? (
          <p className="mt-3 rounded-lg bg-cream-50 px-3 py-6 text-center text-sm text-ink-400">
            등록된 버스킹 일정이 없습니다. 위에서 사진→텍스트로 가져오거나 “일정 추가”를 누르세요.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {sorted.map((e) => (
              <div key={e.id} className="grid grid-cols-[7.5rem_6.5rem_1fr_auto] items-center gap-1.5 rounded-xl bg-cream-50 p-1.5">
                <input type="date" value={e.date} onChange={(ev) => edit(e.id, { date: ev.target.value })} className={cell} />
                <input value={e.time ?? ""} placeholder="시간" onChange={(ev) => edit(e.id, { time: ev.target.value })} className={cell} />
                <div className="flex flex-col gap-1">
                  <input value={e.title} placeholder="공연명" onChange={(ev) => edit(e.id, { title: ev.target.value })} className={cell} />
                  <div className="grid grid-cols-2 gap-1">
                    <input value={e.performer ?? ""} placeholder="공연자" onChange={(ev) => edit(e.id, { performer: ev.target.value })} className={cell} />
                    <input value={e.contact ?? ""} placeholder="연락처" onChange={(ev) => edit(e.id, { contact: ev.target.value })} className={cell} />
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="grid size-8 place-items-center rounded-lg text-ink-300 hover:bg-rose-50 hover:text-rose-500" aria-label="삭제">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {dirty && <SaveBar onSave={save} onRevert={revert} />}
    </div>
  );
}

export function SaveBar({ onSave, onRevert }: { onSave: () => void; onRevert: () => void }) {
  return (
    <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-coral-200 bg-white/95 px-4 py-3 shadow-card backdrop-blur">
      <span className="text-sm font-semibold text-ink-700">저장하지 않은 변경이 있습니다.</span>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onRevert}>
          <Undo2 /> 되돌리기
        </Button>
        <Button size="sm" onClick={onSave}>
          <Save /> 저장
        </Button>
      </div>
    </div>
  );
}
