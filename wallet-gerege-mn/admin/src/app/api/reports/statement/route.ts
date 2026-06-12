import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const acct = q.get('account_no') ?? '';
  const from = q.get('from') ?? '';
  const to = q.get('to') ?? '';
  const r = await adminFetch<{ rows: unknown[] }>(
    `/admin/reports/statement?account_no=${encodeURIComponent(acct)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  if (r.ok) return NextResponse.json(r.data);
  return NextResponse.json({ message: r.message }, { status: r.status });
}
