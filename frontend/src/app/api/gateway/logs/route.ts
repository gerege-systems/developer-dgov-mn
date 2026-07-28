import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/gateway/logs — сүүлийн хүсэлтийн log (limit query дамжина). gateway.manage эрх.
export async function GET(req: Request) {
  const limit = new URL(req.url).searchParams.get('limit');
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : '';
  return proxyResult(await authedFetch(`/gateway/logs${qs}`, { method: 'GET' }));
}
