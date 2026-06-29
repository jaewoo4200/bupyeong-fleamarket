import Image from "next/image";
import { cn } from "@/lib/ui/cn";

/** 부평 문화의거리 공식 아이콘 (쇼핑백+하트) */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logos/cultural-street-icon.png"
      alt="부평 문화의거리"
      width={249}
      height={210}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );
}

export function Logo({
  className,
  subtitle = true,
}: {
  className?: string;
  subtitle?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-extrabold tracking-tight text-ink-900">
          부평 플리마켓
        </span>
        {subtitle && (
          <span className="mt-0.5 text-[11px] font-medium text-ink-400">문화의거리 자리 추첨</span>
        )}
      </span>
    </span>
  );
}
