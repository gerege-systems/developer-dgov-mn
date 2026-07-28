import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/gateway/overview — dashboard-ийн нэгтгэсэн статистик. gateway.manage эрх.
export async function GET() {
  return proxyResult(await authedFetch('/gateway/overview', { method: 'GET' }));
}
