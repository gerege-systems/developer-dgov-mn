import { NextResponse } from 'next/server';
import { authedFetch } from '@gerege/ui-core/lib/api';
import { proxyResult, checkOrigin, checkLangCode, readJson } from '@gerege/ui-core/lib/bff';

export const dynamic = 'force-dynamic';

// POST /api/admin/languages/{code}/translate — хэлийг AI-аар "суулгах".
//
// Эх dictionary-г client илгээнэ: түлхүүрийн жагсаалт нь ЭНЭ аппын өөрийнх
// (lib/i18n.ts дэх багцлагдсан dict) бөгөөд платформ түүнийг мэддэггүй.
// Орчуулга удаан (мянга орчим түлхүүр, багц бүрд Gemini дуудлага) тул хүлээх
// хугацаа уртассан.
export async function POST(req: Request, props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const badCode = checkLangCode(code);
  if (badCode) return badCode;
  const bad = checkOrigin(req);
  if (bad) return bad;

  const { base, base_lang: baseLang, overwrite } = await readJson<{
    base?: unknown;
    base_lang?: unknown;
    overwrite?: unknown;
  }>(req);

  if (!base || typeof base !== 'object' || Array.isArray(base)) {
    return NextResponse.json(
      { ok: false, status: 400, message: 'Эх dictionary шаардлагатай.' },
      { status: 400 },
    );
  }

  return proxyResult(
    await authedFetch(`/languages/${code}/translate`, {
      method: 'POST',
      body: JSON.stringify({
        base,
        base_lang: typeof baseLang === 'string' ? baseLang : 'mn',
        overwrite: overwrite === true,
      }),
    }),
  );
}
