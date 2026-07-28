import { backendFetch } from '@/lib/api';
import { proxyResult } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/public/languages — идэвхтэй хэлний жагсаалт. Нэвтрэлт шаардахгүй:
// нэвтрэх хуудас өөрөө орчуулагдах ёстой тул анонимос хэрэглэгч ч уншина.
export async function GET() {
  return proxyResult(await backendFetch('/languages/enabled', { method: 'GET' }));
}
