import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

// PUT /api/clients/[id]/webhook — client-ийн webhook URL тохируулах (secret нэг удаа).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const r = await adminFetch<{ webhook_url: string; webhook_secret: string }>(
    `/admin/clients/${encodeURIComponent(params.id)}/webhook`,
    { method: 'PUT', body: JSON.stringify({ url: body.url ?? '' }) },
  );
  if (r.ok) return NextResponse.json(r.data);
  return NextResponse.json({ message: r.message }, { status: r.status });
}
