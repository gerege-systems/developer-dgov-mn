import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// PUT /api/clients/[id]/ips — client-ийн IP whitelist (allowed_ips массив).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const ips = Array.isArray(body.allowed_ips) ? body.allowed_ips : [];
  const r = await adminFetch(`/admin/clients/${encodeURIComponent(params.id)}/ips`, {
    method: 'PUT',
    body: JSON.stringify({ allowed_ips: ips }),
  });
  if (r.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ message: r.message }, { status: r.status });
}
