import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "부평 문화의거리 플리마켓 · 자리 추첨",
  description:
    "부평 문화의거리 주말 플리마켓 셀러 자리 추첨 시스템 — 자리배치도, 실시간 추첨, 내 자리 찾기.",
  applicationName: "부평 플리마켓",
};

export const viewport: Viewport = {
  themeColor: "#ec5e2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
