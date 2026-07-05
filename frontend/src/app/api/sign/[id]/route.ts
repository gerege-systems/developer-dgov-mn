import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/session';
import { checkUUID } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/sign/[id] — гарын үсгийн session-ийн төлөв. EidSignView poll хийдэг.
const BASE = (process.env.BACKEND_URL ?? 'http://localhost:8080').replace(/\/$/, '') + '/api/v1';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const badID = checkUUID(id);
  if (badID) return badID;

  const tok = getAccessToken();
  if (!tok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  try {
    const r = await fetch(`${BASE}/sign/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${tok}` },
      cache: 'no-store',
    });
    const text = await r.text();
    let body: unknown;
    try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
    // Go дугтуй {data:{state}}-ийг задалж {state}-болгоно (EidSignView data.state).
    const payload = (body as { data?: unknown })?.data ?? body;
    return NextResponse.json(payload, { status: r.status });
  } catch {
    return NextResponse.json({ state: 'failed', failure_reason: 'backend_unreachable' }, { status: 503 });
  }
}
