import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** env에 Supabase URL/anon 키가 둘 다 있으면 true → Supabase 어댑터 사용 */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

let _client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    if (!URL || !ANON) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
    _client = createClient(URL, ANON, {
      // 관리자 로그인 세션 유지(쓰기 권한). 브라우저에서만 동작.
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return _client;
}

/** 현재 로그인 세션 여부 */
export async function hasSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { data } = await getSupabaseClient().auth.getSession();
  return Boolean(data.session);
}
