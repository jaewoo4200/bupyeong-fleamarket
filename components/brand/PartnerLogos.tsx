import Image from "next/image";
import { cn } from "@/lib/ui/cn";

/** 주최(부평 문화의거리) · 운영(위브라더스) 공식 로고 */
export function PartnerLogos({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-8" : "h-10";
  const hw = size === "sm" ? "h-7" : "h-9";
  return (
    <div className={cn("flex flex-wrap items-center gap-x-7 gap-y-4", className)}>
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold text-ink-400">주최</span>
        <Image
          src="/logos/cultural-street.png"
          alt="부평 문화의거리"
          width={765}
          height={574}
          className={cn(hw, "w-auto")}
          priority={false}
        />
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold text-ink-400">운영</span>
        <div className="overflow-hidden rounded-lg shadow-soft">
          <Image
            src="/logos/webrothers.png"
            alt="위브라더스 (WEBROTHERS)"
            width={717}
            height={387}
            className={cn(h, "w-auto")}
          />
        </div>
      </div>
    </div>
  );
}
