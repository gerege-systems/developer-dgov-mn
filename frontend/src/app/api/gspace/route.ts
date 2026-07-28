import { NextResponse } from 'next/server';
import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult, checkOrigin } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/gspace — Gerege Space-ийн товч (файлууд + ашиглалт/квот).
export async function GET() {
  return proxyResult(await authedFetch('/gspace/', { method: 'GET' }));
}

// DELETE /api/gspace?name=... — файл устгах.
export async function DELETE(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const name = new URL(req.url).searchParams.get('name') ?? '';
  if (!name) {
    return NextResponse.json({ ok: false, status: 400, message: 'Файлын нэр дутуу' }, { status: 400 });
  }
  return proxyResult(await authedFetch(`/gspace/?name=${encodeURIComponent(name)}`, { method: 'DELETE' }));
}
