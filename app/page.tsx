import Link from "next/link";
import Image from "next/image";
import { Search, MonitorPlay, Upload, Hand, MapPinned, ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VenueMapViewer } from "@/components/venue/VenueMapViewer";
import { CategoryLegend, StatusLegend } from "@/components/venue/Legend";

const STEPS = [
  {
    icon: Upload,
    title: "1. 명단 업로드",
    desc: "운영자가 당일 셀러 명단(엑셀)을 올리면 자동으로 카테고리·향제한 셀러가 분류됩니다.",
  },
  {
    icon: Hand,
    title: "2. 터치 추첨",
    desc: "셀러가 한 명씩 나와 화면을 터치하면 남은 자리 중 하나가 공정하게 추첨됩니다.",
  },
  {
    icon: MapPinned,
    title: "3. 내 자리 확인",
    desc: "추첨 결과가 자리배치도에 실시간 반영되고, 셀러는 휴대폰으로 본인 자리를 찾아갑니다.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-market-dots">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
            <div className="flex flex-col justify-center">
              <Image
                src="/logos/cultural-street.png"
                alt="부평 문화의거리"
                width={765}
                height={574}
                priority
                className="mb-5 h-14 w-auto self-start"
              />
              <Badge variant="coral" className="w-fit">
                매주 금·토·일 · 부평 문화의거리
              </Badge>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.12] tracking-tight text-ink-900 sm:text-5xl">
                플리마켓 자리,
                <br />
                <span className="text-coral-600">터치 한 번</span>으로
                <br />
                공정하게.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-500">
                종이 번호표를 접어 통에서 뽑던 자리 추첨을 디지털로. 자리배치도 기반으로 추첨하고,
                결과를 실시간으로 모두가 함께 확인합니다.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/seller">
                  <Button size="lg">
                    <Search /> 내 자리 찾기
                  </Button>
                </Link>
                <Link href="/board">
                  <Button size="lg" variant="outline">
                    <MonitorPlay /> 추첨 현황 보기
                  </Button>
                </Link>
              </div>
              <dl className="mt-9 flex gap-8">
                {[
                  ["80", "좌석"],
                  ["14", "카테고리"],
                  ["금·토·일", "운영"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <dt className="text-2xl font-extrabold text-ink-900 tnum">{n}</dt>
                    <dd className="text-xs font-medium text-ink-400">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 미니 배치도 미리보기 */}
            <div className="flex items-center">
              <div className="w-full rounded-3xl border border-cream-200 bg-white/70 p-4 shadow-card backdrop-blur">
                <p className="mb-2 px-1 text-sm font-bold text-ink-700">자리배치도 미리보기</p>
                <VenueMapViewer defaultView="band1" showTabs={false} />
                <p className="mt-2 px-1 text-xs text-ink-400">윗구간 · 좌석 1~29 / 57~80</p>
              </div>
            </div>
          </div>
        </section>

        {/* 자리배치도 */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-6 flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">자리배치도</h2>
            <p className="text-sm text-ink-500">
              부평 문화의거리를 따라 좌석 1~80번이 배치됩니다. 구간을 눌러 확대해서 보세요.
            </p>
          </div>
          <VenueMapViewer />
          <div className="mt-6 grid gap-5 rounded-2xl border border-cream-200 bg-white p-5 sm:grid-cols-[auto_1fr]">
            <div className="sm:border-r sm:border-cream-200 sm:pr-5">
              <p className="mb-2 text-sm font-bold text-ink-700">자리 상태</p>
              <StatusLegend />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-ink-700">취급상품 카테고리</p>
              <CategoryLegend />
            </div>
          </div>
        </section>

        {/* 진행 방식 */}
        <section className="border-t border-cream-200 bg-cream-100">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">이렇게 진행돼요</h2>
            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-cream-200 bg-white p-6 shadow-soft"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-coral-50 text-coral-600">
                    <s.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-ink-900 px-6 py-5">
              <p className="flex-1 text-sm font-medium text-cream-100">
                운영자이신가요? 명단 업로드와 추첨 진행은 관리자 화면에서.
              </p>
              <Link href="/admin">
                <Button variant="primary">
                  관리자 화면 <ArrowRight />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
