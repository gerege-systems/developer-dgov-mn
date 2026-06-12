import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// POST /api/clients — зөвхөн нэрээр шинэ client үүсгэнэ; admin API нь client_id-г
// автоматаар үүсгэж client_id + secret-ийг буцаана (secret нэг л удаа).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await adminFetch<{ client_id: string; client_secret: string }>('/admin/clients', {
    method: 'POST',
    body: JSON.stringify({ name: body.name ?? '' }),
  });
  if (r.ok) return NextResponse.json(r.data, { status: 201 });
  return NextResponse.json({ message: r.message }, { status: r.status });
}
