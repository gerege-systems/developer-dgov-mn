import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// PATCH /api/accounts/[no] — дансыг царцаах/сэргээх (status: active|frozen|closed).
export async function PATCH(req: Request, { params }: { params: { no: string } }) {
  const body = await req.json().catch(() => ({}));
  const r = await adminFetch(`/admin/accounts/${encodeURIComponent(params.no)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: body.status ?? '' }),
  });
  if (r.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ message: r.message }, { status: r.status });
}
