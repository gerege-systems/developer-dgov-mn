import { BACKEND_BASE, clientIPHeaders } from '@gerege/ui-core/lib/api';
import { readJson, checkOrigin } from '@gerege/ui-core/lib/bff';
import { badRequest, sanitizeAudio, MAX_PUBLIC_AUDIO_B64 } from '@gerege/ui-core/lib/aiBff';

export const dynamic = 'force-dynamic';

const LANGS: string[] = ['mn', 'en', 'zh', 'ru'];
const MAX_TEXT = 1000;
const MAX_TURNS = 6;

interface ChatTurn {
  role?: unknown;
  text?: unknown;
}

// POST /api/public/ai/chat/stream — нээлттэй чатын УРСГАЛТ (SSE) хувилбар.
//
// Энэ route нь backend-ийн урсгалыг ХУВИРГАЛГҮЙ дамжуулна: хариуны body-г
// шууд буцаах тул Next нь бүрэн хариу хүлээхгүй. Буферлэх давхаргуудыг
// унтраана (no-transform, X-Accel-Buffering: no) — эс бөгөөс урсгал цугларч
// нэг дор ирдэг тул «шууд бичигдэх» мэдрэмж алдагдана.
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
  const safeAudio = sanitizeAudio(audio, MAX_PUBLIC_AUDIO_B64);
  if ((!text && !safeAudio) || text.length > MAX_TEXT) {
    return badRequest('Мессеж хоосон эсвэл хэт урт байна.');
  }

  const safeLang = LANGS.includes(lang as string) ? (lang as string) : '';
  const safeHistory = (Array.isArray(history) ? history : [])
    .filter((t) => (t?.role === 'user' || t?.role === 'model') && typeof t?.text === 'string')
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role as string, text: (t.text as string).slice(0, MAX_TEXT) }));

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_BASE}/public/ai/chat/stream`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(await clientIPHeaders()),
      },
      body: JSON.stringify({
        message: text,
        ...(safeAudio ? { audio: safeAudio } : {}),
        ...(safeLang ? { lang: safeLang } : {}),
        history: safeHistory,
      }),
    });
  } catch {
    return badRequest('Backend-тэй холбогдож чадсангүй.');
  }

  // Backend алдаа (rate limit, validation) нь JSON — байгаагаар нь дамжуулна.
  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
