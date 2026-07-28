import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult, readJson, checkOrigin } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyResult(await authedFetch('/gov/appointments', { method: 'GET' }));
}

export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const body = await readJson(req);
  return proxyResult(await authedFetch('/gov/appointments', { method: 'POST', body: JSON.stringify(body) }));
}
