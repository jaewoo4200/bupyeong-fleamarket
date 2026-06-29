import { CATEGORIES } from "@/lib/venue/categories";
import { BENCH_SOLID, BENCH_COLOR } from "@/lib/venue/bench";
import { cn } from "@/lib/ui/cn";

const OTHER_COLOR = BENCH_COLOR === "blue" ? "red" : "blue";

export function CategoryLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-2", className)}>
      {CATEGORIES.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1.5 text-xs text-ink-500">
          <span
            className="size-3 rounded-[4px]"
            style={{ backgroundColor: c.color }}
            aria-hidden
          />
          {c.label}
        </span>
      ))}
    </div>
  );
}

export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-500", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] border border-cream-300 bg-white" /> 빈자리
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-coral-400" /> 배정됨
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="relative size-3 rounded-[4px] border border-cream-300 bg-white">
          <span className="absolute inset-x-0 top-0 h-[3px] rounded-t-[4px] bg-[#A9744F]" />
        </span>
        나무매대
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: BENCH_SOLID[BENCH_COLOR] }} /> 의자 비치(벤치)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: BENCH_SOLID[OTHER_COLOR] }} /> 의자 지급 필요
      </span>
    </div>
  );
}
