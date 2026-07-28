import { NextResponse } from 'next/server';
import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult, checkOrigin, readJson } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// GET /api/admin/languages — бүх хэл (super admin). Эрхийг backend шалгана.
export async function GET() {
  return proxyResult(await authedFetch('/languages', { method: 'GET' }));
}

// POST /api/admin/languages — шинэ хэл нэмэх. Хэл нь унтраалттай үүснэ.
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const { code, label, locale } = await readJson<{
    code?: unknown;
    label?: unknown;
    locale?: unknown;
  }>(req);

  if (typeof code !== 'string' || code.trim() === '') {
    return NextResponse.json({ ok: false, status: 400, message: 'Хэлний код шаардлагатай.' }, { status: 400 });
  }
  if (typeof label !== 'string' || label.trim() === '' || label.length > 80) {
    return NextResponse.json({ ok: false, status: 400, message: 'Хэлний нэр буруу байна.' }, { status: 400 });
  }

  return proxyResult(
    await authedFetch('/languages', {
      method: 'POST',
      body: JSON.stringify({
        code: code.trim(),
        label: label.trim(),
        locale: typeof locale === 'string' ? locale.trim() : '',
      }),
    }),
  );
}
