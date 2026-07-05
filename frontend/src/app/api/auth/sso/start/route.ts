import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET /api/auth/sso/start — Gerege SSO (sso.gerege.mn, OIDC) нэвтрэлт эхлүүлэх.
// Backend /sso/start нь state үүсгэж (Redis), authorize URL буцаана; browser-ийг
// тийш чиглүүлнэ. Landing дээрх "Gerege SSO-гоор нэвтрэх" товч энд заана.
export async function GET(req: Request) {
  const r = await backendFetch<{ auth_url?: string }>('/sso/start', { method: 'POST' });
  const authURL = r.ok ? r.data?.auth_url : undefined;
  if (!authURL) {
    return NextResponse.redirect(new URL('/login?error=sso', req.url));
  }
  return NextResponse.redirect(authURL);
}
