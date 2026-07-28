import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyResult(await authedFetch('/gov/payments', { method: 'GET' }));
}
