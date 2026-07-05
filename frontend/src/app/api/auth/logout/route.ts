import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendFetch } from '@/lib/api';
import { getRefreshToken, getAccessToken } from '@/lib/session';
import { checkOrigin } from '@/lib/bff';
import { ACCESS_COOKIE, REFRESH_COOKIE, SSO_LOGOUT_COOKIE } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout — refresh токенг backend-ийн blacklist руу, access
// токенг deny-list руу илгээж, cookie-г заавал цэвэрлэнэ. SSO-ээр нэвтэрсэн бол
// (gerege_sso_logout cookie байвал) хариунд sso_logout_url буцаана — клиент тийш
// чиглүүлж, SSO (Hydra) дээрх session-ийг мөн дуусгана. Backend амжилтгүй ч
// client тал нэвтрэлтгүй болж, дахин нэвтрэхийг шаардана.
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const refresh = getRefreshToken();
  if (refresh) {
    await backendFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refresh, access_token: getAccessToken() ?? '' }),
    });
  }

  const ssoLogoutURL = cookies().get(SSO_LOGOUT_COOKIE)?.value;

  const res = NextResponse.json({
    ok: true,
    status: 200,
    message: 'Гарлаа',
    ...(ssoLogoutURL ? { data: { sso_logout_url: ssoLogoutURL } } : {}),
  });
  // Бүх session cookie-г устгана (SSO logout URL cookie-г мөн).
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  res.cookies.delete(SSO_LOGOUT_COOKIE);
  return res;
}
