import { backendFetch } from '@/lib/api';
import { getRefreshToken, getAccessToken, clearSession } from '@/lib/session';
import { toClientResponse, checkOrigin } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout — refresh токенг backend-ийн blacklist руу, access
// токенг deny-list руу илгээж, cookie-г заавал цэвэрлэнэ. Backend амжилтгүй
// ч client тал нэвтрэлтгүй болж, дахин нэвтрэхийг шаардана.
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
  clearSession();
  return toClientResponse({ ok: true, status: 200, message: 'Гарлаа' });
}
