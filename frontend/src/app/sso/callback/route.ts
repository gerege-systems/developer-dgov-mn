import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api';
import { ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_MAX_AGE, REFRESH_MAX_AGE, cookieOptions } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

// GET /sso/callback — Gerege SSO-д бүртгэгдсэн redirect_uri. sso.gerege.mn
// нэвтрэлтийн дараа browser-ийг ?code&state-тэй энд буцаана. Backend /sso/callback
// нь state-ийг шалгаж, code-ийг токен болгож солин, иргэнийг upsert хийж JWT хос
// олгоно; токен хосыг httpOnly cookie-д суулгаад /me/dashboard руу шилжүүлнэ.
// Токен/refresh_token хэзээ ч browser JS-д хүрэхгүй.
export async function GET(req: Request) {
  const url = new URL(req.url);

  // Хэрэглэгч цуцалсан / SSO алдаа → нэвтрэх хуудас руу тайлбартай буцаана.
  if (url.searchParams.get('error')) {
    return NextResponse.redirect(new URL('/login?error=sso', url.origin));
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=sso', url.origin));
  }

  const r = await backendFetch<{ token?: string; refresh_token?: string }>('/sso/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });

  if (r.ok && r.data?.token && r.data?.refresh_token) {
    // Cookie-г redirect хариун дээр шууд суулгана — ингэснээр top-level
    // навигацид (lax) найдвартай хадгалагдана.
    const res = NextResponse.redirect(new URL('/me/dashboard', url.origin));
    res.cookies.set(ACCESS_COOKIE, r.data.token, cookieOptions(ACCESS_MAX_AGE));
    res.cookies.set(REFRESH_COOKIE, r.data.refresh_token, cookieOptions(REFRESH_MAX_AGE));
    return res;
  }
  return NextResponse.redirect(new URL('/login?error=sso', url.origin));
}
