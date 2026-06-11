import { NextResponse } from 'next/server';
import { authedFetch } from '@/lib/api';
import { readJson, proxyResult, checkOrigin } from '@/lib/bff';

export const dynamic = 'force-dynamic';

interface ChatTurn {
  role?: unknown;
  text?: unknown;
}

// POST /api/ai/chat — AI туслахын чат. Backend POST /ai/chat (JWT шаардана)
// руу прокси; reply/steps/degraded өгөгдлийг клиент рүү дамжуулна (токен
// агуулдаггүй). Backend дээр нарийн validation бий — энд зөвхөн хэлбэрийг
// whitelist хийж бөөн/буруу payload-ийг эртхэн таслана.
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const { message, history } = await readJson<{ message?: unknown; history?: ChatTurn[] }>(req);

  if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
    return NextResponse.json(
      { ok: false, status: 400, message: 'Мессеж хоосон эсвэл хэт урт байна.' },
      { status: 400 },
    );
  }

  const safeHistory = (Array.isArray(history) ? history : [])
    .filter((t) => (t?.role === 'user' || t?.role === 'model') && typeof t?.text === 'string')
    .slice(-20)
    .map((t) => ({ role: t.role as string, text: (t.text as string).slice(0, 4000) }));

  return proxyResult(
    await authedFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: message.trim(), history: safeHistory }),
    }),
  );
}
