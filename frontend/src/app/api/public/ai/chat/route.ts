import { backendFetch } from '@gerege/ui-core/lib/api';
import { readJson, proxyResult, checkOrigin } from '@gerege/ui-core/lib/bff';
import { badRequest, sanitizeAudio, MAX_PUBLIC_AUDIO_B64 } from '@gerege/ui-core/lib/aiBff';

export const dynamic = 'force-dynamic';

// Backend-ийн AIPublicChatRequest-тэй ижил хязгаарууд.
const LANGS: string[] = ['mn', 'en', 'zh', 'ru'];
const MAX_TEXT = 1000;
const MAX_TURNS = 6;

interface ChatTurn {
  role?: unknown;
  text?: unknown;
}

// POST /api/public/ai/chat — нүүр хуудасны НЭЭЛТТЭЙ (нэвтрэлтгүй) чат виджет.
// authedFetch БИШ backendFetch-ээр явна: токен хавсаргахгүй, зөвхөн клиент
// IP-г (X-Forwarded-For) дамжуулна — backend талын per-IP rate limit үүн дээр
// тулгуурладаг. checkOrigin нь өөр сайтаас хийх cross-site дуудлагыг хаана.
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const { message, audio, history, lang } = await readJson<{
    message?: unknown;
    audio?: unknown;
    history?: ChatTurn[];
    lang?: unknown;
  }>(req);

  const text = typeof message === 'string' ? message.trim() : '';
  // push-to-talk — audio ганцаараа ирж болно (текст хоосон).
  const safeAudio = sanitizeAudio(audio, MAX_PUBLIC_AUDIO_B64);
  if ((!text && !safeAudio) || text.length > MAX_TEXT) {
    return badRequest('Мессеж хоосон эсвэл хэт урт байна.');
  }

  const safeLang = LANGS.includes(lang as string) ? (lang as string) : '';

  const safeHistory = (Array.isArray(history) ? history : [])
    .filter((t) => (t?.role === 'user' || t?.role === 'model') && typeof t?.text === 'string')
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role as string, text: (t.text as string).slice(0, MAX_TEXT) }));

  return proxyResult(
    await backendFetch('/public/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        ...(safeAudio ? { audio: safeAudio } : {}),
        ...(safeLang ? { lang: safeLang } : {}),
        history: safeHistory,
      }),
    }),
  );
}
