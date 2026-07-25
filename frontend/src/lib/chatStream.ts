// Gerege Template Platform V3.0
// Gerege Systems Development Team & Claude AI, 2026
//
// Server-Sent Events (SSE)-ийг fetch-ээр уншина. EventSource ашиглаагүй
// шалтгаан: тэр нь зөвхөн GET дэмждэг бөгөөд CSRF толгой нэмэх боломжгүй —
// чат нь POST + `x-dgov-csrf` шаарддаг.

import { CSRF_HEADER } from './client';

export interface ChatStreamHandlers {
  /** Дуут мессежийн текст хуулбар (нэг удаа). */
  onTranscript?: (text: string) => void;
  /** Хариултын дараагийн хэсэг. */
  onDelta?: (text: string) => void;
  /** Өмнөх delta-г хаях (model tool дуудахаасаа өмнө текст бичсэн). */
  onReset?: () => void;
}

export interface ChatStreamResult {
  ok: boolean;
  degraded?: boolean;
  /** Сүлжээ/сервер алдааны товч шалтгаан (UI өөрийн мессежээ сонгоно). */
  status?: number;
}

/**
 * streamChat нь SSE урсгалыг уншиж, event бүрийг handler руу дамжуулна.
 * Урсгал таслагдвал (сүлжээ тасарсан) ok:false буцаана — дуудагч хэрэв
 * ямар нэг текст аль хэдийн харуулсан бол түүнийгээ үлдээж болно.
 */
export async function streamChat(
  path: string,
  body: unknown,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<ChatStreamResult> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: '1' },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    return { ok: false };
  }

  if (!res.ok || !res.body) return { ok: false, status: res.status };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let degraded: boolean | undefined;
  let done = false;

  // SSE frame = "event: <нэр>\ndata: <json>\n\n". Хэсэгчилсэн frame-ийг
  // дараагийн chunk хүртэл buf-д хадгална.
  while (!done) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      return { ok: false, degraded };
    }
    if (chunk.done) break;

    buf += decoder.decode(chunk.value, { stream: true });
    let sep = buf.indexOf('\n\n');
    while (sep >= 0) {
      const frame = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      sep = buf.indexOf('\n\n');

      let name = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;

      let payload: { text?: string; degraded?: boolean } = {};
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }

      switch (name) {
        case 'transcript':
          if (payload.text) handlers.onTranscript?.(payload.text);
          break;
        case 'delta':
          if (payload.text) handlers.onDelta?.(payload.text);
          break;
        case 'reset':
          handlers.onReset?.();
          break;
        case 'done':
          degraded = payload.degraded;
          done = true;
          break;
        case 'error':
          return { ok: false, degraded };
      }
    }
  }

  return { ok: true, degraded };
}

/**
 * plainText нь model-ийн markdown тэмдэглэгээг цэвэрлэнэ.
 *
 * Хоёр шалтгаан: (1) виджетийн бөмбөлөг markdown-ыг render хийдэггүй тул
 * `**`, `##` зэрэг тэмдэг нүдэнд харагддаг; (2) TTS нь эдгээрийг заримдаа
 * чангаар уншдаг («од од QR код»). Жагсаалтын дугаар/цэгийг үлдээнэ —
 * агуулгын бүтэц ойлгомжтой байх ёстой.
 */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')       // код блок — уншиж/харуулж утгагүй
    .replace(/`([^`]+)`/g, '$1')            // inline код
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // тод
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2') // налуу (жагсаалтын * биш)
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')     // гарчиг
    .replace(/^\s*[*-]\s+/gm, '• ')         // жагсаалтын цэг
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // холбоос — зөвхөн текст
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * takeSentence нь хуримтлагдсан текстээс ДУУССАН өгүүлбэрийг таслаж авна
 * (үлдэгдлийг хоёр дахь утгаар буцаана). Дуут хариултыг урсгалын явцад
 * өгүүлбэр бүрээр нь дуугаргахад хэрэглэнэ — бүтэн хариулт хүлээхгүй тул
 * ярианы хариу мэдэгдэхүйц хурдан эхэлнэ.
 */
export function takeSentence(buffer: string, minLen = 12): [string | null, string] {
  const marks = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '\n'];
  let cut = -1;
  for (const m of marks) {
    const i = buffer.indexOf(m);
    if (i >= 0 && (cut < 0 || i < cut)) cut = i + m.length;
  }
  // Мөрийн төгсгөлд таарсан цэг (сүүлийн өгүүлбэр) — flush үед авна.
  if (cut < 0) return [null, buffer];
  const sentence = buffer.slice(0, cut).trim();
  if (sentence.length < minLen) {
    // Хэт богино хэсгийг дангаар нь дуугаргах нь таагүй — дараагийнхтай нийлүүлнэ.
    const [next, rest] = takeSentence(buffer.slice(cut), minLen);
    return next ? [`${sentence} ${next}`.trim(), rest] : [null, buffer];
  }
  return [sentence, buffer.slice(cut)];
}
