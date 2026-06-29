"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, LocateFixed } from "lucide-react";
import { cn } from "@/lib/ui/cn";

/** 부평 문화의거리 행사장 중심 좌표 */
const VENUE = { lat: 37.49414268345465, lng: 126.7242697366158 };

type Status = "idle" | "locating" | "active" | "denied" | "unsupported";

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI; // -180..180, 0=북
}
function cardinal(deg: number) {
  const dirs = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

export function GpsGuide() {
  const [status, setStatus] = useState<Status>("idle");
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    };
  }, []);

  async function start() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    // iOS: 방위 센서 권한(사용자 제스처 필요)
    try {
      const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (D && typeof D.requestPermission === "function") {
        const res = await D.requestPermission();
        if (res === "granted") attachOrientation();
      } else {
        attachOrientation();
      }
    } catch {
      /* 방위는 선택 — 실패해도 거리/방향은 표시 */
    }
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy });
        setStatus("active");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
  }

  function attachOrientation() {
    window.addEventListener(
      "deviceorientation",
      (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
        const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null);
        if (h != null) setHeading(h);
      },
      true,
    );
  }

  if (status === "idle") {
    return (
      <button
        onClick={start}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-ink-700"
      >
        <LocateFixed className="size-4" /> 현장에서 길찾기 (GPS)
      </button>
    );
  }

  if (status === "unsupported" || status === "denied") {
    return (
      <p className="mt-3 rounded-xl bg-cream-100 px-4 py-2.5 text-sm text-ink-500">
        {status === "denied" ? "위치 권한이 거부되었습니다. " : "이 기기는 위치를 지원하지 않습니다. "}
        아래 배치도와 안내 문구로 찾아가세요.
      </p>
    );
  }

  const dist = pos ? distanceM(pos, VENUE) : null;
  const brg = pos ? bearingDeg(pos, VENUE) : 0;
  const arrow = brg - (heading ?? 0); // 화면 기준 회전(휴대폰이 향한 방향 보정)

  return (
    <div className="mt-3 flex items-center gap-4 rounded-xl border border-cream-200 bg-white px-4 py-3">
      <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-coral-50">
        <Navigation
          className="size-8 text-coral-600 transition-transform"
          style={{ transform: `rotate(${arrow}deg)` }}
          fill="currentColor"
        />
      </div>
      <div className="min-w-0">
        {status === "locating" || !pos ? (
          <p className="text-sm font-semibold text-ink-500">위치 확인 중…</p>
        ) : (
          <>
            <p className="text-sm font-bold text-ink-900">
              행사장까지 약 {dist! >= 1000 ? (dist! / 1000).toFixed(1) + "km" : Math.round(dist!) + "m"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
              <MapPin className="size-3.5 text-coral-500" />
              {heading != null ? "화살표 방향으로 이동" : `${cardinal(brg)}쪽 (북 기준)`}
              {pos.acc ? ` · 오차 ±${Math.round(pos.acc)}m` : ""}
            </p>
          </>
        )}
        <p className="mt-1 text-[11px] text-ink-400">도착 후엔 아래 배치도·안내로 정확한 자리를 찾으세요.</p>
      </div>
    </div>
  );
}
