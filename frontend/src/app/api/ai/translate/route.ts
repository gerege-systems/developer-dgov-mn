import { authedFetch } from '@gerege/ui-core/lib/api';
import { readJson, proxyResult, checkOrigin } from '@gerege/ui-core/lib/bff';
import { sanitizeAudio, badRequest } from '@gerege/ui-core/lib/aiBff';

export const dynamic = 'force-dynamic';

// Зорилтот хэлний зөвшөөрөгдсөн кодууд (UI-ийн сонголттой ижил).
const TARGET_LANGS = new Set(['mn', 'en', 'ru', 'zh', 'ja', 'ko', 'de']);

// POST /api/ai/translate — текст/audio-г зорилтот хэл рүү орчуулна.
// Live орчуулга: frontend богино audio chunk-уудыг дараалан илгээдэг.
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const { text, audio, target_lang, speak } = await readJson<{
    text?: unknown;
    audio?: unknown;
    target_lang?: unknown;
    speak?: unknown;
  }>(req);

  const safeText = typeof text === 'string' ? text.trim() : '';
  const safeAudio = sanitizeAudio(audio);
  if ((!safeText && !safeAudio) || safeText.length > 4000) {
    return badRequest('Текст эсвэл audio шаардлагатай.');
  }
  if (typeof target_lang !== 'string' || !TARGET_LANGS.has(target_lang)) {
    return badRequest('target_lang буруу байна.');
  }

  return proxyResult(
    await authedFetch('/ai/translate', {
      method: 'POST',
      body: JSON.stringify({
        text: safeText,
        ...(safeAudio ? { audio: safeAudio } : {}),
        target_lang,
        speak: speak === true,
      }),
    }),
  );
}
