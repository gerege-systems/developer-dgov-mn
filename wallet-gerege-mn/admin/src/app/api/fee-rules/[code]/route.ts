import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// PATCH /api/fee-rules/[code] — шимтгэлийн дүрмийг идэвхжүүлэх/унтраах.
export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  const body = await req.json().catch(() => ({}));
  const r = await adminFetch(`/admin/fee-rules/${encodeURIComponent(params.code)}`, {
    method: 'PATCH',
    body: JSON.stringify({ active: !!body.active }),
  });
  if (r.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ message: r.message }, { status: r.status });
}
