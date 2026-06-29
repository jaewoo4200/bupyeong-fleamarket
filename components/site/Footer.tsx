import { MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PartnerLogos } from "@/components/brand/PartnerLogos";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-cream-200 bg-cream-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PartnerLogos />
        <div className="mt-7 flex flex-col gap-4 border-t border-cream-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo subtitle={false} />
          <div className="flex items-start gap-2 text-sm text-ink-500">
            <MapPin className="mt-0.5 size-4 shrink-0 text-coral-600" />
            <div>
              <p className="font-semibold text-ink-700">부평 문화의거리</p>
              <p>인천 부평구 · 위도 37.49414, 경도 126.72427</p>
            </div>
          </div>
          <p className="text-xs text-ink-400">© 2026 부평 플리마켓 운영팀 · PoC</p>
        </div>
      </div>
    </footer>
  );
}
