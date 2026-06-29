"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const AUTH_KEY = "bupyeong-flea/admin-auth";
// PoC 비밀번호. 운영 전환 시 Supabase Auth(이메일/비번 로그인)로 교체.
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "bupyeong";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(typeof window !== "undefined" && localStorage.getItem(AUTH_KEY) === "1");
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
    }
  }

  if (authed === null) return null; // 마운트 전
  if (authed) return <>{children}</>;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <Card className="p-7">
        <div className="flex size-12 items-center justify-center rounded-xl bg-ink-900 text-cream-50">
          <Lock className="size-5" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-ink-900">운영자 로그인</h1>
        <p className="mt-1 text-sm text-ink-400">
          관리자 비밀번호를 입력하세요. (PoC — 운영 전환 시 정식 로그인으로 교체)
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw">비밀번호</Label>
            <Input
              id="pw"
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setError(false);
              }}
              placeholder="••••••••"
            />
            {error && <p className="text-xs font-semibold text-rose-500">비밀번호가 올바르지 않습니다.</p>}
          </div>
          <Button type="submit" size="lg">
            로그인
          </Button>
        </form>
      </Card>
    </main>
  );
}

export function adminLogout() {
  if (typeof window !== "undefined") localStorage.removeItem(AUTH_KEY);
}
