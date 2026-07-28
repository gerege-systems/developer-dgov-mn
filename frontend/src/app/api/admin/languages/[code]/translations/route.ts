import { NextResponse } from 'next/server';
import { authedFetch } from '@/lib/api';
import { proxyResult, checkOrigin, checkLangCode, readJson } from '@/lib/bff';

export const dynamic = 'force-dynamic';

// PUT /api/admin/languages/{code}/translations — орчуулгыг гараар бичих.
// Бичсэн түлхүүрүүд 'manual' болж тэмдэглэгдэх тул дараагийн автомат орчуулга
// эдгээрийг дарж бичихгүй.
export async function PUT(req: Request, props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const badCode = checkLangCode(code);
  if (badCode) return badCode;
  const bad = checkOrigin(req);
  if (bad) return bad;

  const { entries } = await readJson<{ entries?: unknown }>(req);
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
    return NextResponse.json(
      { ok: false, status: 400, message: 'Орчуулгын багц шаардлагатай.' },
      { status: 400 },
    );
  }

  return proxyResult(
    await authedFetch(`/languages/${code}/translations`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }),
  );
}
