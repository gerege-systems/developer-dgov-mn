import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = q.get('from') ?? '';
  const to = q.get('to') ?? '';
  const r = await adminFetch<{ rows: unknown[] }>(`/admin/reports/turnover?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (r.ok) return NextResponse.json(r.data);
  return NextResponse.json({ message: r.message }, { status: r.status });
}
