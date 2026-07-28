import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/relay/overview — SLA хяналтын самбарын нэгтгэл. relay.view эрх.
export async function GET() {
  return proxyResult(await authedFetch('/relay/overview', { method: 'GET' }));
}
