// Gerege Template Platform V3.0
// Gerege Systems Development Team & Claude AI, 2026
"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, X, MessageCircle, Mic, Volume2 } from 'lucide-react';
import { postJSON } from '@/lib/client';
import { streamChat, takeSentence, plainText } from '@/lib/chatStream';
import { recordSegment, playBase64Audio, unlockAudio, type RecordedAudio } from '@/lib/audio';
import type { Lang } from '@/lib/i18n';
import type { LandingCopy } from './copy';

interface Msg {
  /** Бөмбөлгийг дараа нь (жишээ нь STT хуулбараар) шинэчлэхэд хэрэглэнэ. */
  id: number;
  role: 'user' | 'model';
  text: string;
  /** Алдаа / fallback хариу — дараагийн хүсэлтийн түүхэнд орохгүй. */
  degraded?: boolean;
  /** Дуут мессеж байсан эсэх (бөмбөлөгт микрофоны тэмдэг). */
  voice?: boolean;
}

/** Backend-ийн AIPublicChatRequest-тэй ижил хязгаарууд. */
const MAX_TEXT = 1000;
const MAX_TURNS = 6;
/** Push-to-talk бичлэгийн дээд урт — backend-ийн ~250 KB base64-д багтана. */
const MAX_VOICE_MS = 15000;
/** Үүнээс богино даралт нь санамсаргүй товшилт — илгээхгүй. */
const MIN_VOICE_MS = 400;

/**
 * Нүүр хуудасны баруун доод буланд хөвөх AI туслах — НЭВТРЭЛТГҮЙ ажиллана.
 *
 * `/api/public/ai/chat` BFF route руу явна; тэр нь токенгүйгээр backend-ийн
 * нээлттэй endpoint руу дамжуулдаг (per-IP rate limit + богино payload
 * хязгаартай). Чат нь зөвхөн browser-ийн санах ойд байна — хуудас сэргээхэд
 * түүх арилна (нэргүй зочны яриаг сервер талд хадгалдаггүй).
 *
 * Дуу: микрофоны товчийг ДАРЖ БАРИХ хугацаанд бичээд (push-to-talk), тавихад
 * илгээнэ — model нь audio-г шууд ойлгодог тул тусдаа STT алхам хэрэггүй.
 * Хариултыг чанга яригчийн товчоор сонсож болно (`/api/public/ai/tts`).
 */
export default function LandingChat({ copy, lang }: { copy: LandingCopy['chat']; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  /** Хариултын эхний хэсэг ирсэн эсэх — «Бодож байна…»-г нуухад. */
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const segmentRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** Хуруу ОДОО дарж байгаа эсэх — зөвшөөрөл асуух хугацаанд салгасныг барина. */
  const holdingRef = useRef(false);
  /** Бичлэг эхэлсэн мөч — хэт богино даралтыг (санамсаргүй товшилт) шүүнэ. */
  const startedAtRef = useRef(0);
  /** Товчны доор гарах богино зөвлөмж (зөвшөөрөл өгсний дараа г.м.). */
  const [hint, setHint] = useState('');
  /** Мессежийн дараалсан дугаар (React key + дараа шинэчлэхэд). */
  const nextIdRef = useRef(0);
  /** Дуут хариултын дараалал — өгүүлбэрүүд давхцахгүй, ээлжлэн тоглоно. */
  const speakQueueRef = useRef<Promise<void>>(Promise.resolve());
  /** Товч тавих мөчид нээсэн аудио элемент (iOS-ийн автомат тоглуулалтын хориг). */
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, open]);

  // Нээхэд оролтод фокус; Esc дарахад хаана.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Хаах / unmount үед микрофоныг заавал суллана.
  useEffect(() => {
    if (open) return;
    holdingRef.current = false;
    segmentRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setHint('');
  }, [open]);

  useEffect(() => {
    return () => {
      segmentRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const dispatch = useCallback(
    async (
      payload: { message?: string; audio?: RecordedAudio },
      bubble: Omit<Msg, 'id'>,
      opts?: { speak?: boolean; audioEl?: HTMLAudioElement | null },
    ) => {
      // Түүхэнд зөвхөн бүтэн ээлжүүд — алдааны мессежийг дахин илгээхгүй.
      const history = messages
        .filter((m) => !m.degraded)
        .slice(-MAX_TURNS)
        .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_TEXT) }));

      const bubbleId = nextIdRef.current++;
      const replyId = nextIdRef.current++;
      setMessages((m) => [...m, { ...bubble, id: bubbleId }]);
      setBusy(true);
      setStreaming(false);

      // Урсгалын явцад хариултын бөмбөлгийг ҮГ ТУС БҮРЭЭР нь ургуулна.
      // Бөмбөлөг үүссэн эсэхийг ТӨЛӨВӨӨС нь шалгана (гадаад тугаас биш) —
      // React updater-ийг дахин дуудвал бөмбөлөг давхардахгүй.
      let reply = '';
      const appendDelta = (text: string) => {
        reply += text;
        setStreaming(true);
        const shown = plainText(reply);
        setMessages((m) =>
          m.some((x) => x.id === replyId)
            ? m.map((x) => (x.id === replyId ? { ...x, text: shown } : x))
            : [...m, { id: replyId, role: 'model', text: shown }],
        );
      };

      // Дуут асуултад дуут хариу. Дуудалтыг ХЭМНЭНЭ: эхний өгүүлбэрийг
      // бэлэн болмогц (хурдан эхлэхийн тулд), үлдсэнийг урсгал дуусахад
      // НЭГ дуудалтаар. Өгүүлбэр бүрд дуудвал rate limit-д мөргөж хариулт
      // дунд нь тасардаг байсан.
      let sayBuf = '';
      let firstSpoken = false;
      const enqueue = (text: string) => {
        const clean = plainText(text).slice(0, 800);
        if (!clean) return;
        speakQueueRef.current = speakQueueRef.current
          .then(async () => {
            const res = await postJSON<{ mime?: string; data?: string }>('/api/public/ai/tts', { text: clean });
            if (res.ok && res.data?.mime && res.data?.data) {
              await playBase64Audio(res.data.mime, res.data.data, opts?.audioEl ?? null);
            }
          })
          .catch(() => {});
      };

      try {
        const out = await streamChat(
          '/api/public/ai/chat/stream',
          { ...payload, history, lang },
          {
            onTranscript: (text) =>
              setMessages((m) => m.map((x) => (x.id === bubbleId ? { ...x, text } : x))),
            onReset: () => {
              reply = '';
              sayBuf = '';
              setStreaming(false);
              setMessages((m) => m.filter((x) => x.id !== replyId));
            },
            onDelta: (text) => {
              appendDelta(text);
              if (!opts?.speak) return;
              sayBuf += text;
              if (firstSpoken) return;
              const [sentence, rest] = takeSentence(sayBuf);
              if (sentence) {
                firstSpoken = true;
                sayBuf = rest;
                enqueue(sentence);
              }
            },
          },
        );

        // Үлдсэн хэсгийг нэг дуудалтаар (эхний өгүүлбэр аль хэдийн яригдаж
        // байх зуур бэлдэгдэнэ — хэрэглэгч завсарлага мэдрэхгүй).
        if (opts?.speak && sayBuf.trim()) enqueue(sayBuf.trim());

        if (!out.ok && !reply) {
          const text = payload.audio ? copy.noSpeech : copy.error;
          setMessages((m) => [...m, { id: nextIdRef.current++, role: 'model', text, degraded: true }]);
        } else if (out.degraded) {
          setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, degraded: true } : x)));
        }
      } catch {
        setMessages((m) => [...m, { id: nextIdRef.current++, role: 'model', text: copy.error, degraded: true }]);
      } finally {
        setBusy(false);
        setStreaming(false);
      }
    },
    [messages, lang, copy.error, copy.noSpeech],
  );

  async function sendText(raw: string) {
    const text = raw.trim().slice(0, MAX_TEXT);
    if (!text || busy || recording) return;
    setInput('');
    await dispatch({ message: text }, { role: 'user', text });
  }

  // --- push-to-talk (walkie-talkie): товчийг дарж барих хугацаанд бичнэ ---

  /**
   * Микрофоны урсгал авна. Эхний удаа хөтөч зөвшөөрөл асуух бөгөөд тэр
   * хугацаанд хэрэглэгч хуруугаа авчихдаг — тэр тохиолдлыг доор барина.
   * Урсгалыг бичлэг бүрийн дараа хаана: нээлттэй үлдээвэл гар утсан дээр
   * «бичиж байна» гэсэн улаан заалт байнга асаастай байх нь зочныг эвгүйрүүлнэ.
   */
  async function openMic(): Promise<MediaStream | null> {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name ?? '';
      noteError(name === 'NotAllowedError' ? copy.micDenied : copy.micError);
      return null;
    }
  }

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function beginHold() {
    if (busy || recording) return;
    setHint('');

    const stream = await openMic();
    if (!stream) return;

    // Зөвшөөрлийн цонх нээлттэй байх зуур хуруу салсан бол бичлэг эхлүүлэхгүй —
    // оронд нь «одоо дарж барина уу» гэж зөвлөнө (зөвшөөрөл нь өгөгдсөн).
    if (!holdingRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      setHint(copy.micReady);
      return;
    }

    streamRef.current = stream;
    setRecording(true);
    startedAtRef.current = performance.now();

    const seg = recordSegment(stream, MAX_VOICE_MS);
    segmentRef.current = seg;
    const audio = await seg.done;
    const heldMs = performance.now() - startedAtRef.current;

    setRecording(false);
    segmentRef.current = null;
    releaseMic();

    // Санамсаргүй товшилт — илгээхгүй, юу хийхийг сануулна.
    if (!audio || heldMs < MIN_VOICE_MS) {
      setHint(copy.tooShort);
      return;
    }
    // Дуугаар асуувал хариуг ч дуугаар — walkie-talkie урсгал бүрэн болно.
    // audioEl нь товч тавихад (хэрэглэгчийн үйлдэл) нээгдсэн элемент.
    await dispatch({ audio }, { role: 'user', text: copy.voiceMsg, voice: true }, {
      speak: true,
      audioEl: audioElRef.current,
    });
  }

  function endHold() {
    holdingRef.current = false;
    // Товч тавих нь хэрэглэгчийн үйлдэл — iOS-ийн аудио түгжээг ЯГ ЭНД тайлна
    // (хариу ирэх үед үйлдлийн эрх дууссан байдаг).
    audioElRef.current = unlockAudio();
    segmentRef.current?.stop();
  }

  // --- хариултыг сонсох (нэг мессеж = нэг TTS дуудалт) ---

  /** Алдааны мессежийг давхардуулахгүй нэмнэ (дараалсан ижил мөр утгагүй). */
  function noteError(text: string) {
    setMessages((m) =>
      m[m.length - 1]?.text === text ? m : [...m, { id: nextIdRef.current++, role: 'model', text, degraded: true }],
    );
  }

  async function speak(idx: number, text: string) {
    if (speakingIdx !== null || busy) return;
    // ЗААВАЛ await-аас өмнө: iOS Safari нь даралтын дотор нээгдсэн элементэд л
    // дараа нь програмаар тоглуулах эрх өгдөг (lib/audio.ts unlockAudio).
    const el = unlockAudio();
    setSpeakingIdx(idx);
    try {
      const body = await postJSON<{ mime?: string; data?: string }>('/api/public/ai/tts', { text });
      // Тоглуулалт өөрөө ч бүтэлгүйтэж болно (хөтчийн бодлого, буруу формат) —
      // чимээгүй өнгөрвөл «товч ажиллахгүй байна» мэт харагдана.
      const played =
        body.ok && body.data?.mime && body.data?.data
          ? await playBase64Audio(body.data.mime, body.data.data, el)
          : false;
      if (!played) noteError(copy.ttsError);
    } catch {
      noteError(copy.ttsError);
    } finally {
      setSpeakingIdx(null);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`lp-chat__fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? copy.close : copy.open}
        aria-expanded={open}
        title={open ? copy.close : copy.open}
      >
        {open ? <X size={22} strokeWidth={2} /> : <MessageCircle size={22} strokeWidth={2} />}
      </button>

      {open && (
        <div className="lp-chat__panel" role="dialog" aria-label={copy.title}>
          <header className="lp-chat__head">
            <span className="lp-chat__mark" aria-hidden="true">
              <Bot size={18} strokeWidth={1.8} />
            </span>
            <span className="lp-chat__titles">
              <strong>{copy.title}</strong>
              <small>{copy.sub}</small>
            </span>
            <button type="button" className="lp-chat__x" onClick={() => setOpen(false)} aria-label={copy.close}>
              <X size={16} strokeWidth={2} />
            </button>
          </header>

          <div className="lp-chat__scroll" aria-live="polite">
            <div className="lp-chat__msg lp-chat__msg--model">
              <div className="lp-chat__bubble">{copy.greeting}</div>
            </div>
            {messages.map((m, i) => (
              <div key={m.id} className={`lp-chat__msg lp-chat__msg--${m.role}${m.degraded ? ' is-degraded' : ''}`}>
                <div className="lp-chat__bubble">
                  {m.voice && <Mic size={12} strokeWidth={2} className="lp-chat__voiceico" />}
                  {m.text}
                </div>
                {m.role === 'model' && !m.degraded && (
                  <button
                    type="button"
                    className="lp-chat__listen"
                    onClick={() => void speak(i, m.text)}
                    disabled={speakingIdx !== null || busy}
                    aria-label={copy.listen}
                    title={copy.listen}
                  >
                    <Volume2 size={13} strokeWidth={2} className={speakingIdx === i ? 'lp-chat__speaking' : undefined} />
                  </button>
                )}
              </div>
            ))}
            {/* «Бодож байна…» нь ЗӨВХӨН эхний үсэг ирэхээс өмнө — урсгал эхэлмэгц
                хариулт өөрөө харагдана (эс тэгвээс хоёулаа зэрэг харагдана). */}
            {busy && !streaming && (
              <div className="lp-chat__msg lp-chat__msg--model">
                <div className="lp-chat__bubble lp-chat__bubble--pending">{copy.thinking}</div>
              </div>
            )}
            {messages.length === 0 && !busy && (
              <div className="lp-chat__chips">
                {copy.suggestions.map((s) => (
                  <button key={s} type="button" className="lp-chat__chip" onClick={() => void sendText(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Walkie-talkie: том дугуй товчийг дарж барих хугацаанд бичээд
              тавихад илгээнэ. setPointerCapture нь хуруу товчноос гулсахад ч
              pointerup-ыг ижил элемент дээр барих тул бичлэг санамсаргүй
              тасрахгүй (iOS дээр түгээмэл асуудал). */}
          <div className="lp-chat__ptt-row">
            <button
              type="button"
              className={`lp-chat__ptt${recording ? ' is-recording' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                holdingRef.current = true;
                void beginHold();
              }}
              onPointerUp={endHold}
              onPointerCancel={endHold}
              onContextMenu={(e) => e.preventDefault()}
              disabled={busy}
              aria-label={recording ? copy.recording : copy.hold}
              aria-pressed={recording}
            >
              <Mic size={26} strokeWidth={2} />
            </button>
            <span className="lp-chat__ptt-hint">
              {recording ? copy.recording : hint || copy.hold}
            </span>
          </div>

          <form
            className="lp-chat__form"
            onSubmit={(e) => {
              e.preventDefault();
              void sendText(input);
            }}
          >
            <input
              ref={inputRef}
              className="lp-chat__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? copy.recording : copy.placeholder}
              maxLength={MAX_TEXT}
              aria-label={copy.placeholder}
              disabled={busy || recording}
            />
            <button
              type="submit"
              className="lp-chat__send"
              disabled={busy || recording || !input.trim()}
              aria-label={copy.send}
            >
              <Send size={16} strokeWidth={2} />
            </button>
          </form>

          <p className="lp-chat__privacy">{recording ? copy.recordingHint : copy.privacy}</p>
        </div>
      )}
    </>
  );
}
