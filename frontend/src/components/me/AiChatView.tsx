"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Wrench } from 'lucide-react';
import PageHead from '@/components/PageHead';
import { useT } from '@/lib/lang';

interface ChatMsg {
  role: 'user' | 'model';
  text: string;
  /** AI-ийн ашигласан backend функцууд (pipeline steps). */
  tools?: string[];
  /** Алдаа / fallback хариу — дараагийн хүсэлтийн history-д орохгүй. */
  degraded?: boolean;
}

interface ChatData {
  reply?: string;
  steps?: { tool?: string }[];
  degraded?: boolean;
}

/**
 * AI туслахын чат — мессежүүдийг client талд барьж (stateless backend),
 * /api/ai/chat BFF route-оор Gemini pipeline руу илгээнэ. Хариу бүрд AI-ийн
 * ашигласан функцуудыг (steps) жижгээр харуулна.
 */
export default function AiChatView() {
  const { T } = useT();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    // Fallback/алдааны хариуг дараагийн context-оос хасна.
    const history = messages
      .filter((m) => !m.degraded)
      .map((m) => ({ role: m.role, text: m.text }))
      .slice(-20);

    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      let body: { ok?: boolean; message?: string; data?: ChatData } | null = null;
      try {
        body = await res.json();
      } catch {
        /* JSON биш хариу — доор нэгдсэн алдаа */
      }
      if (body?.ok && body.data?.reply) {
        const tools = (body.data.steps ?? [])
          .map((s) => s.tool)
          .filter((t): t is string => typeof t === 'string' && t.length > 0);
        setMessages((m) => [
          ...m,
          { role: 'model', text: body.data?.reply ?? '', tools, degraded: body.data?.degraded },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: 'model', text: body?.message || T('ai.error'), degraded: true },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'model', text: T('ai.error'), degraded: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead eyebrowKey="me.ai.eyebrow" titleKey="me.ai.title" subKey="me.ai.sub" />

      <div className="card aichat">
        <div className="aichat__scroll" aria-live="polite">
          {messages.length === 0 && !busy && (
            <div className="aichat__empty">
              <Bot size={28} strokeWidth={1.6} />
              <p>{T('ai.empty')}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`aichat__msg aichat__msg--${m.role}${m.degraded ? ' is-degraded' : ''}`}>
              <div className="aichat__bubble">{m.text}</div>
              {m.tools && m.tools.length > 0 && (
                <span className="aichat__tools">
                  <Wrench size={12} strokeWidth={2} /> {T('ai.tools')} {m.tools.join(', ')}
                </span>
              )}
            </div>
          ))}
          {busy && (
            <div className="aichat__msg aichat__msg--model">
              <div className="aichat__bubble aichat__bubble--pending">{T('ai.thinking')}</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="aichat__form" onSubmit={send}>
          <input
            className="input aichat__input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={T('ai.placeholder')}
            maxLength={4000}
            disabled={busy}
            autoComplete="off"
          />
          <button className="btn btn--primary" type="submit" disabled={busy || !input.trim()}>
            <Send size={16} strokeWidth={2} />
            <span>{T('ai.send')}</span>
          </button>
        </form>
      </div>
    </>
  );
}
