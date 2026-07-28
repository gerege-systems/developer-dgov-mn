import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult, checkOrigin } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  return proxyResult(await authedFetch('/gov/notifications/read-all', { method: 'POST' }));
}
