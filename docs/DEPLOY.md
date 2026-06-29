# 배포 & 연결 가이드 (GitHub · Vercel · Supabase)

> 추천 순서: ① GitHub 푸시 → ② Vercel 배포(로컬 어댑터로 바로 동작) → ③ Supabase 연결 후 재배포.

## 1. GitHub 푸시
원격은 이미 설정됨(`origin = https://github.com/jaewoo4200/bupyeong-fleamarket.git`).
인증되는 환경(본인 터미널)에서 한 줄:
```bash
git push -u origin main
```
- HTTPS면 GitHub 사용자명 + **Personal Access Token**(비밀번호 아님) 입력.
- 또는 `gh auth login` 후 `git push`. (SSH 쓰면 remote를 `git@github.com:jaewoo4200/bupyeong-fleamarket.git`로 변경)

## 2. Vercel 배포 (실시간 백엔드 없이도 동작)
1. https://vercel.com → **Add New → Project** → GitHub의 `bupyeong-fleamarket` import.
2. 프레임워크 **Next.js** 자동 인식 → 그대로 **Deploy**. (별도 설정 불필요)
3. 환경변수(선택, 지금은 없어도 됨): Project → Settings → Environment Variables
   - `NEXT_PUBLIC_ADMIN_PASSWORD` = 원하는 관리자 비번
   - (Supabase 연결 시) 아래 키들 추가 후 **Redeploy**.
4. 배포되면 `https://<프로젝트>.vercel.app` 라이브 URL 획득.

> 이 상태(로컬 어댑터)에서도 한 기기 안 여러 탭은 실시간 동기화됩니다. **기기 간** 실시간은 3단계 필요.

## 3. Supabase 연결
### 3-1. 프로젝트 생성
1. https://supabase.com → New project (무료). Region: **Northeast Asia (Seoul)** 권장.
2. Project Settings → API 에서 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)

### 3-2. 스키마 적용
Supabase 대시보드 → **SQL Editor** → New query 에 아래 파일 내용을 순서대로 붙여넣고 실행:
1. `supabase/migrations/0001_init.sql` (테이블 + draw_seat RPC + RLS + Realtime)
2. `supabase/seed.sql` (좌석 카탈로그 80석)

(또는 Supabase CLI: `supabase link` 후 `supabase db push`)

### 3-3. 키 설정
- 로컬: `.env.example` → `.env.local` 복사 후 값 채우기.
- Vercel: Settings → Environment Variables 에 3개 키 추가 → Redeploy.

### 3-4. 앱이 자동 전환
`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`가 있으면 앱이 Supabase 어댑터로 전환되도록 데이터 레이어가 설계되어 있습니다(어댑터 연결 작업은 별도 진행). 키만 채우면 기기 간 실시간·영구 저장이 활성화됩니다.

## 메모
- `.env*`는 git에 커밋되지 않습니다(.gitignore). 키는 Vercel/로컬에만.
- `service_role` 키는 절대 클라이언트(NEXT_PUBLIC_*)로 노출하지 마세요.
