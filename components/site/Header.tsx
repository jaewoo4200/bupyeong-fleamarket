import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const NAV = [
  { href: "/seller", label: "내 자리 조회" },
  { href: "/board", label: "추첨 현황" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-cream-200 bg-cream-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="홈으로">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-ink-700"
          >
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}
