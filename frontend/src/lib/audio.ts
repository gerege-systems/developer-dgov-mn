// Browser талын audio туслахууд — бичлэг (MediaRecorder) болон base64
// хөрвүүлэлт. AI voice боломжууд (дуут мессеж, live орчуулга) хэрэглэнэ.

/** MediaRecorder-ийн дэмждэг хамгийн тохиромжтой audio mime-г сонгоно. */
export function pickAudioMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'audio/webm';
}

/** Blob-ийг base64 мөр болгоно (data: prefix-гүй). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? '');
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface RecordedAudio {
  /** Backend-ийн whitelist-тэй таарах цэвэр mime (codec параметргүй). */
  mime: string;
  /** base64 кодлогдсон бичлэг. */
  data: string;
}

/**
 * Нэг бичлэгийн сегмент — recorder-ийг stop() хийх хүртэл бичээд бүрэн
 * (тоглуулах боломжтой) файл болгож буцаана. Live орчуулга сегментүүдийг
 * дараалан авдаг: timeslice-тэй chunk нь зөвхөн эхнийдээ container header
 * агуулдаг тул сегмент бүрд шинэ MediaRecorder ажиллуулна.
 */
export function recordSegment(
  stream: MediaStream,
  maxMs: number,
): { stop: () => void; done: Promise<RecordedAudio | null> } {
  const mimeFull = pickAudioMime();
  const recorder = new MediaRecorder(stream, { mimeType: mimeFull });
  const chunks: Blob[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const done = new Promise<RecordedAudio | null>((resolve) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      if (timer) clearTimeout(timer);
      if (chunks.length === 0) return resolve(null);
      const blob = new Blob(chunks, { type: mimeFull });
      try {
        const data = await blobToBase64(blob);
        resolve({ mime: mimeFull.split(';')[0], data });
      } catch {
        resolve(null);
      }
    };
    recorder.onerror = () => resolve(null);
  });

  recorder.start();
  timer = setTimeout(() => {
    if (recorder.state !== 'inactive') recorder.stop();
  }, maxMs);

  return {
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop();
    },
    done,
  };
}

// SILENT_WAV — 0.05 секундын чимээгүй бичлэг (8kHz, 8-bit). iOS Safari-гийн
// «түгжээ тайлахад» хэрэглэнэ (доорх unlockAudio-г үзнэ үү).
const SILENT_WAV =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

// Нэг л <audio> элементийг дахин ашиглана: iOS Safari нь ХЭРЭГЛЭГЧИЙН
// ДАРАЛТЫН дотор play() дуудагдсан элементэд л дараа нь програмаар тоглуулах
// эрх өгдөг. Шинэ Audio() бүрд энэ эрх дахин шаардагдана.
let sharedAudio: HTMLAudioElement | null = null;

/**
 * unlockAudio — хэрэглэгчийн даралтын дотор (await-аас ӨМНӨ) дуудна.
 *
 * Яагаад: TTS-ийн аудио сервер дээр 3-12 секунд бэлдэгддэг. Тэр хугацааны
 * дараа `new Audio(...).play()` дуудахад iOS Safari «хэрэглэгчийн үйлдэлгүй»
 * гэж үзээд татгалздаг (desktop Chrome нь sticky activation-тай тул ажилладаг).
 * Иймд даралтын мөчид чимээгүй клипээр элементийг «нээж» аваад, аудио бэлэн
 * болмогц ижил элемент дээр src-г солино.
 */
export function unlockAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!sharedAudio) sharedAudio = new Audio();
  try {
    sharedAudio.src = SILENT_WAV;
    void sharedAudio.play().catch(() => {});
  } catch {
    /* тоглуулах боломжгүй — доор play() дахин оролдоно */
  }
  return sharedAudio;
}

/** base64 мөрийг Blob болгоно (том аудионд data: URI-аас найдвартай). */
function base64ToBlob(mime: string, data: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * base64 audio-г тоглуулна; дуустал хүлээгээд ТОГЛОСОН ЭСЭХИЙГ буцаана
 * (false бол дуудагч хэрэглэгчид мэдэгдэнэ — чимээгүй бүтэлгүйтэл нь «товч
 * ажиллахгүй байна» мэт харагддаг).
 *
 * data: URI биш blob: URL хэрэглэнэ: Safari/iOS нь хэдэн зуун KB-ын data:
 * URI-г заримдаа татгалздаг. CSP-д media-src blob: зөвшөөрөгдсөн.
 */
export function playBase64Audio(mime: string, data: string, el?: HTMLAudioElement | null): Promise<boolean> {
  return new Promise((resolve) => {
    let url: string;
    try {
      url = URL.createObjectURL(base64ToBlob(mime, data));
    } catch {
      resolve(false);
      return;
    }
    // unlockAudio-оос ирсэн элемент байвал түүнийг дахин ашиглана (iOS).
    const audio = el ?? new Audio();
    audio.src = url;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    void audio.play().catch(() => finish(false));
  });
}
