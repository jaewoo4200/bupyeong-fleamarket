"use client";

import { useState } from "react";
import { Copy, Check, Sparkles, ChevronDown } from "lucide-react";

/**
 * "사진 → 텍스트 자동입력" 안내 + 복붙용 프롬프트.
 * 운영자가 프롬프트를 복사해 자신의 AI(ChatGPT/Claude)에 사진과 함께 넣으면,
 * 구조화된 텍스트가 나오고 그걸 아래 입력칸에 붙여넣는다. (우리 서비스는 텍스트만 처리)
 */
export function SchedulePromptBox({ prompt, kind }: { prompt: string; kind: "버스킹" | "근무자" }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard 불가 환경 — 사용자가 직접 선택 복사 */
    }
  }

  return (
    <div className="rounded-2xl border border-[#d9e7f5] bg-[#f3f9ff] p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1683c9] text-white">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink-900">사진 → 텍스트로 자동입력 (AI 활용)</p>
          <p className="text-xs text-ink-500">사진을 내가 쓰는 AI에 넣어 텍스트로 바꾼 뒤 아래에 붙여넣기</p>
        </div>
        <ChevronDown className={"size-4 text-ink-400 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="mt-3">
          <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-xs text-ink-600">
            <li>아래 <b>프롬프트 복사</b> 버튼을 누르세요.</li>
            <li>내가 쓰는 AI(ChatGPT·Claude 등)에 <b>{kind} 일정 사진과 함께</b> 붙여넣어 실행합니다.</li>
            <li>AI가 준 결과 텍스트를 그대로 복사해 <b>아래 입력칸</b>에 붙여넣으세요.</li>
          </ol>
          <div className="relative">
            <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-xl border border-cream-200 bg-white p-3 pr-24 text-[11px] leading-relaxed text-ink-700">
              {prompt}
            </pre>
            <button
              onClick={copy}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-cream-50 hover:bg-ink-700"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "복사됨" : "프롬프트 복사"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
