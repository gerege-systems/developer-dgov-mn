import { backendFetch } from '@/lib/api';
import { readJson, proxyResult, checkOrigin } from '@/lib/bff';
import { badRequest } from '@/lib/aiBff';

export const dynamic = 'force-dynamic';

// Backend-ийн AIPublicTTSRequest-тэй ижил хязгаар.
const MAX_TEXT = 800;

// POST /api/public/ai/tts — нүүрийн нээлттэй чатын «сонсох» товч. Токенгүй
// (backendFetch); backend талд нээлттэй чаттай нэг rate limiter-т багтана —
// нэг зочин минутанд цөөн дуудалт хийнэ. Дуу хоолойг сервер сонгоно (клиент
// model/voice заахгүй).
export async function POST(req: Request) {
  const bad = checkOrigin(req);
  if (bad) return bad;

  const { text } = await readJson<{ text?: unknown }>(req);
  const clean = typeof text === 'string' ? text.trim() : '';
  if (!clean) return badRequest('Текст хоосон байна.');

  return proxyResult(
    await backendFetch('/public/ai/tts', {
      method: 'POST',
      body: JSON.stringify({ text: clean.slice(0, MAX_TEXT) }),
    }),
  );
}
