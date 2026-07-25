// Gerege Template Platform V3.0
// Gerege Systems Development Team & Claude AI, 2026
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, MessageCircle } from 'lucide-react';
import { postJSON } from '@/lib/client';
import type { Lang } from '@/lib/i18n';
import type { LandingCopy } from './copy';

interface Msg {
  role: 'user' | 'model';
  text: string;
  /** Алдаа / fallback хариу — дараагийн хүсэлтийн түүхэнд орохгүй. */
  degraded?: boolean;
}

interface ChatData {
  reply?: string;
  degraded?: boolean;
}

/** Backend-ийн AIPublicChatRequest-тэй ижил хязгаарууд. */
const MAX_TEXT = 1000;
const MAX_TURNS = 6;

/**
 * Нүүр хуудасны баруун доод буланд хөвөх AI туслах — НЭВТРЭЛТГҮЙ ажиллана.
 *
 * `/api/public/ai/chat` BFF route руу явна; тэр нь токенгүйгээр backend-ийн
 * нээлттэй endpoint руу дамжуулдаг (per-IP rate limit + богино payload
 * хязгаартай). Чат нь зөвхөн browser-ийн санах ойд байна — хуудас сэргээхэд
 * түүх арилна (нэргүй зочны яриаг сервер талд хадгалдаггүй).
 */
export default function LandingChat({ copy, lang }: { copy: LandingCopy['chat']; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function send(raw: string) {
    const text = raw.trim().slice(0, MAX_TEXT);
    if (!text || busy) return;

    // Түүхэнд зөвхөн бүтэн ээлжүүд — алдааны мессежийг дахин илгээхгүй.
    const history = [...messages]
      .filter((m) => !m.degraded)
      .slice(-MAX_TURNS)
      .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_TEXT) }));

    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const body = await postJSON<ChatData>('/api/public/ai/chat', { message: text, history, lang });
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
                <div className="lp-chat__bubble">{m.text}</div>
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
                  <button key={s} type="button" className="lp-chat__chip" onClick={() => void send(s)}>
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
              void send(input);
            }}
          >
            <input
              ref={inputRef}
              className="lp-chat__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={copy.placeholder}
              maxLength={MAX_TEXT}
              aria-label={copy.placeholder}
              disabled={busy}
            />
            <button type="submit" className="lp-chat__send" disabled={busy || !input.trim()} aria-label={copy.send}>
              <Send size={16} strokeWidth={2} />
            </button>
          </form>

          <p className="lp-chat__privacy">{copy.privacy}</p>
        </div>
      )}
    </>
  );
}
