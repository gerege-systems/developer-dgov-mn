import { backendFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/site/theme — идэвхтэй landing theme (нийтийн, auth-гүй).
export async function GET() {
  return proxyResult(await backendFetch('/themes/active', { method: 'GET' }));
}
