import { backendFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/site/appearance — сайтын нийтийн харагдацын default (accent · font ·
// style · theme). Нийтийн (auth-гүй) — landing болон админ UI хоёулаа уншина.
export async function GET() {
  return proxyResult(await backendFetch('/site/appearance', { method: 'GET' }));
}
