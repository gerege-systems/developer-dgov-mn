import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// PATCH /api/clients/[id] — client-ийг идэвхжүүлэх/идэвхгүй болгох.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const r = await adminFetch(`/admin/clients/${encodeURIComponent(params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ active: !!body.active }),
  });
  if (r.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ message: r.message }, { status: r.status });
}
