// Gerege Template Platform V3.0
// Gerege Systems Development Team & Claude AI, 2026
"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, X, MessageCircle, Mic, Volume2 } from 'lucide-react';
import { postJSON } from '@/lib/client';
import { recordSegment, playBase64Audio, type RecordedAudio } from '@/lib/audio';
import type { Lang } from '@/lib/i18n';
import type { LandingCopy } from './copy';

interface Msg {
  role: 'user' | 'model';
  text: string;
  /** Алдаа / fallback хариу — дараагийн хүсэлтийн түүхэнд орохгүй. */
  degraded?: boolean;
  /** Дуут мессеж байсан эсэх (бөмбөлөгт микрофоны тэмдэг). */
  voice?: boolean;
}

interface ChatData {
  reply?: string;
  degraded?: boolean;
}

/** Backend-ийн AIPublicChatRequest-тэй ижил хязгаарууд. */
const MAX_TEXT = 1000;
const MAX_TURNS = 6;
/** Push-to-talk бичлэгийн дээд урт — backend-ийн ~250 KB base64-д багтана. */
const MAX_VOICE_MS = 15000;

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
  const [recording, setRecording] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const segmentRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** Бичлэг аль хэдийн илгээгдсэн эсэх — pointerup/leave давхар ажиллахаас хамгаална. */
  const stoppingRef = useRef(false);

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
    segmentRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [open]);

  useEffect(() => {
    return () => {
      segmentRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const dispatch = useCallback(
    async (payload: { message?: string; audio?: RecordedAudio }, bubble: Msg) => {
      // Түүхэнд зөвхөн бүтэн ээлжүүд — алдааны мессежийг дахин илгээхгүй.
      const history = messages
        .filter((m) => !m.degraded)
        .slice(-MAX_TURNS)
        .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_TEXT) }));

      setMessages((m) => [...m, bubble]);
      setBusy(true);
      try {
        const body = await postJSON<ChatData>('/api/public/ai/chat', { ...payload, history, lang });
        if (body.ok && body.data?.reply) {
          setMessages((m) => [...m, { role: 'model', text: body.data!.reply as string, degraded: body.data!.degraded }]);
        } else {
          setMessages((m) => [...m, { role: 'model', text: copy.error, degraded: true }]);
        }
      } catch {
        setMessages((m) => [...m, { role: 'model', text: copy.error, degraded: true }]);
      } finally {
        setBusy(false);
      }
    },
    [messages, lang, copy.error],
  );

  async function sendText(raw: string) {
    const text = raw.trim().slice(0, MAX_TEXT);
    if (!text || busy || recording) return;
    setInput('');
    await dispatch({ message: text }, { role: 'user', text });
  }

  // --- push-to-talk: дарж барих хугацаанд бичнэ ---

  async function startRecording() {
    if (busy || recording) return;
    stoppingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Барихаа больчихсон байж магадгүй (зөвшөөрөл асуух хооронд) — тэгвэл болино.
      if (stoppingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setRecording(true);

      const seg = recordSegment(stream, MAX_VOICE_MS);
      segmentRef.current = seg;
      const audio = await seg.done;

      setRecording(false);
      segmentRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      if (audio) {
        await dispatch({ audio }, { role: 'user', text: copy.voiceMsg, voice: true });
      }
    } catch (err) {
      setRecording(false);
      // NotAllowedError = хэрэглэгч татгалзсан эсвэл бодлогоор хаагдсан;
      // NotFoundError = төхөөрөмж алга. Хоёулаа ижил зөвлөмжтэй тул нэг мессеж.
      const name = (err as { name?: string } | null)?.name ?? '';
      const text = name === 'NotAllowedError' ? copy.micDenied : copy.micError;
      setMessages((m) => [...m, { role: 'model', text, degraded: true }]);
    }
  }

  function stopRecording() {
    stoppingRef.current = true;
    segmentRef.current?.stop();
  }

  // --- хариултыг сонсох (нэг мессеж = нэг TTS дуудалт) ---

  async function speak(idx: number, text: string) {
    if (speakingIdx !== null || busy) return;
    setSpeakingIdx(idx);
    try {
      const body = await postJSON<{ mime?: string; data?: string }>('/api/public/ai/tts', { text });
      // Тоглуулалт өөрөө ч бүтэлгүйтэж болно (хөтчийн бодлого, буруу формат) —
      // чимээгүй өнгөрвөл «товч ажиллахгүй байна» мэт харагдана.
      const played =
        body.ok && body.data?.mime && body.data?.data
          ? await playBase64Audio(body.data.mime, body.data.data)
          : false;
      if (!played) {
        setMessages((m) => [...m, { role: 'model', text: copy.ttsError, degraded: true }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'model', text: copy.ttsError, degraded: true }]);
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
              <div key={i} className={`lp-chat__msg lp-chat__msg--${m.role}${m.degraded ? ' is-degraded' : ''}`}>
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
            {busy && (
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

          <form
            className="lp-chat__form"
            onSubmit={(e) => {
              e.preventDefault();
              void sendText(input);
            }}
          >
            {/* Push-to-talk: дарж барих хугацаанд бичнэ, тавихад илгээнэ.
                Pointer event-үүд нь хулгана болон хүрэлт хоёуланд ажиллана;
                pointerleave нь товчноос гулсаад гарахад бичлэгийг хаана. */}
            <button
              type="button"
              className={`lp-chat__mic${recording ? ' is-recording' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                void startRecording();
              }}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              onPointerCancel={stopRecording}
              disabled={busy}
              aria-label={recording ? copy.recording : copy.hold}
              title={recording ? copy.recording : copy.hold}
            >
              <Mic size={16} strokeWidth={2} />
            </button>
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
