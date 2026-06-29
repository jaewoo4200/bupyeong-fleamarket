"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";

const AUTH_KEY = "bupyeong-flea/admin-auth";
// 로컬(무-Supabase) PoC 비밀번호.
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "bupyeong";

export function AdminGate({ children }: { children: React.ReactNode }) {
  return isSupabaseConfigured() ? <SupabaseGate>{children}</SupabaseGate> : <LocalGate>{children}</LocalGate>;
}

/** 운영: Supabase Auth(이메일/비밀번호) 로그인 */
function SupabaseGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getSupabaseClient();
    sb.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setError("로그인 실패 — 이메일/비밀번호를 확인하세요.");
  }

  if (authed === null) return null;
  if (authed) return <>{children}</>;

  return (
    <GateShell
      subtitle="운영자 계정(이메일·비밀번호)으로 로그인하세요."
      onSubmit={submit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw">비밀번호</Label>
        <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "로그인 중…" : "로그인"}
      </Button>
    </GateShell>
  );
}

/** 로컬 PoC: 단일 비밀번호 게이트 */
function LocalGate({ children }: { children: React.ReactNode }) {
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
    } else setError(true);
  }

  if (authed === null) return null;
  if (authed) return <>{children}</>;

  return (
    <GateShell subtitle="관리자 비밀번호를 입력하세요. (로컬 PoC)" onSubmit={submit}>
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
    </GateShell>
  );
}

function GateShell({
  subtitle,
  onSubmit,
  children,
}: {
  subtitle: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <Card className="p-7">
        <div className="flex size-12 items-center justify-center rounded-xl bg-ink-900 text-cream-50">
          <Lock className="size-5" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-ink-900">운영자 로그인</h1>
        <p className="mt-1 text-sm text-ink-400">{subtitle}</p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          {children}
        </form>
      </Card>
    </main>
  );
}

export function adminLogout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  if (isSupabaseConfigured()) void getSupabaseClient().auth.signOut();
}
