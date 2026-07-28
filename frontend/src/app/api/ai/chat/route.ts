import { authedFetch } from '@gerege/ui-core/lib/api';
import { readJson, proxyResult, checkOrigin } from '@gerege/ui-core/lib/bff';
import { sanitizeAudio, badRequest } from '@gerege/ui-core/lib/aiBff';

export const dynamic = 'force-dynamic';

// Backend-ийн AIChatRequest.Lang-тай ижил цагаан жагсаалт.
const LANGS: string[] = ['mn', 'en', 'zh', 'ru'];

interface ChatTurn {
  role?: unknown;
  text?: unknown;
}

// POST /api/ai/chat — AI туслахын чат (текст ба/эсвэл дуут мессеж). Backend
// POST /ai/chat (JWT шаардана) руу прокси; reply/steps/degraded өгөгдлийг
// клиент рүү дамжуулна (токен агуулдаггүй).
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
  const safeAudio = sanitizeAudio(audio);
  if ((!text && !safeAudio) || text.length > 4000) {
    return badRequest('Мессеж хоосон эсвэл хэт урт байна.');
  }

  // UI-ийн хэл — туслах үүгээр хариулна. Backend DTO-той ижил цагаан жагсаалт;
  // танихгүй утгыг огт дамжуулахгүй (сервер өгөгдмөл mn-ээ хэрэглэнэ).
  const safeLang = LANGS.includes(lang as string) ? (lang as string) : '';

  const safeHistory = (Array.isArray(history) ? history : [])
    .filter((t) => (t?.role === 'user' || t?.role === 'model') && typeof t?.text === 'string')
    .slice(-20)
    .map((t) => ({ role: t.role as string, text: (t.text as string).slice(0, 4000) }));

  return proxyResult(
    await authedFetch('/ai/chat', {
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
