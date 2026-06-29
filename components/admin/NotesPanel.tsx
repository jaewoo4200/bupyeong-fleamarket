"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Check, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData, useStore } from "@/lib/data/hooks";
import { cn } from "@/lib/ui/cn";
import type { Note } from "@/lib/data/types";

const TAGS: { key: NonNullable<Note["tag"]>; label: string; color: string }[] = [
  { key: "chair", label: "의자", color: "#149e84" },
  { key: "table", label: "테이블", color: "#4C8DD6" },
  { key: "facility", label: "시설", color: "#d99e2b" },
  { key: "etc", label: "기타", color: "#978a7c" },
];
const TAG_MAP = Object.fromEntries(TAGS.map((t) => [t.key, t]));

const PRESETS = [
  "의자 추가 요청",
  "테이블 균형 맞추기",
  "하수구 덮개 점검",
  "전기/배전반 확인",
];

export function NotesPanel({ eventId }: { eventId: string }) {
  const store = useStore();
  const data = useAppData();
  const [text, setText] = useState("");
  const [tag, setTag] = useState<NonNullable<Note["tag"]>>("chair");

  const notes = useMemo(
    () =>
      data.notes
        .filter((n) => n.eventId === eventId)
        .sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt)),
    [data.notes, eventId],
  );
  const open = notes.filter((n) => !n.done).length;

  function add() {
    if (!text.trim()) return;
    store.addNote(eventId, text, tag);
    setText("");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-cream-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <StickyNote className="size-5 text-coral-600" />
          <h3 className="font-bold text-ink-900">현장 메모</h3>
          <span className="text-sm text-ink-400">미처리 {open}건</span>
        </div>
        <p className="mt-1 text-sm text-ink-400">
          셀러 요청·시설 이슈를 기록하세요. 모든 운영자 화면에 실시간 공유됩니다.
        </p>

        {/* 태그 선택 */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTag(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                tag === t.key ? "border-transparent text-white" : "border-cream-300 text-ink-500",
              )}
              style={tag === t.key ? { backgroundColor: t.color } : undefined}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: tag === t.key ? "#fff" : t.color }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* 입력 */}
        <div className="mt-2 flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="예: 57~59 구간 의자 2개 추가 요청"
          />
          <Button onClick={add}>
            <Plus /> 추가
          </Button>
        </div>

        {/* 빠른 입력 */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setText(p)}
              className="rounded-full bg-cream-100 px-2.5 py-1 text-xs text-ink-500 hover:bg-cream-200"
            >
              + {p}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <ul className="mt-4 flex flex-col gap-2">
        {notes.length === 0 && (
          <li className="rounded-xl bg-cream-100 px-4 py-8 text-center text-sm text-ink-400">
            아직 메모가 없습니다.
          </li>
        )}
        {notes.map((n) => {
          const t = n.tag ? TAG_MAP[n.tag] : undefined;
          return (
            <li
              key={n.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-cream-200 bg-white p-3",
                n.done && "opacity-60",
              )}
            >
              <button
                onClick={() => store.toggleNote(n.id)}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                  n.done ? "border-teal-500 bg-teal-500 text-white" : "border-cream-300 hover:border-teal-400",
                )}
                title={n.done ? "미처리로" : "처리 완료"}
              >
                {n.done && <Check className="size-4" />}
              </button>
              {t && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.label}
                </span>
              )}
              <span className={cn("min-w-0 flex-1 text-sm text-ink-900", n.done && "line-through")}>
                {n.text}
              </span>
              <button
                onClick={() => store.removeNote(n.id)}
                className="shrink-0 rounded-lg p-1.5 text-ink-300 hover:bg-rose-50 hover:text-rose-500"
                title="삭제"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
