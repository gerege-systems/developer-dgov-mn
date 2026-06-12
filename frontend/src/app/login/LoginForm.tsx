"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Smartphone, RefreshCw } from 'lucide-react';
import Alert from '@/components/Alert';
import { postJSON } from '@/lib/client';
import { safeNext } from '@/lib/navigation';
import { useT } from '@/lib/lang';

interface StartData {
  session_id: string;
  device_link_url: string;
  verification_code: string;
  expires_at: string;
}

type Phase = 'starting' | 'waiting' | 'expired' | 'refused' | 'error' | 'success';

const POLL_INTERVAL_MS = 2500;

export default function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const router = useRouter();
  const { T } = useT();

  const [phase, setPhase] = useState<Phase>('starting');
  const [start, setStart] = useState<StartData | null>(null);

  // unmount хийсний дараа интервалд timer-уудыг цэвэрлэхэд ашиглана.
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const noticeText =
    notice === 'verified' ? 'Бүртгэл баталгаажлаа. Одоо нэвтэрнэ үү.'
    : notice === 'registered' ? 'Бүртгэл үүслээ.'
    : notice === 'reset' ? 'Нууц үг шинэчлэгдлээ.'
    : '';

  const stopTimers = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (expiryTimer.current) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  }, []);

  const poll = useCallback(
    async (sessionId: string) => {
      const res = await postJSON<{ state?: string }>('/api/auth/eid/poll', { session_id: sessionId });
      if (!mounted.current) return;

      if (!res.ok) {
        // Сүлжээ/түр зуурын алдаа — дараагийн интервалд дахин оролдоно.
        return;
      }

      const state = res.data?.state;
      if (state === 'COMPLETE') {
        stopTimers();
        setPhase('success');
        router.push(safeNext(next));
        router.refresh();
        return;
      }
      if (state === 'EXPIRED') {
        stopTimers();
        setPhase('expired');
        return;
      }
      if (state === 'REFUSED') {
        stopTimers();
        setPhase('refused');
        return;
      }
      // RUNNING — үргэлжлүүлэн хүлээнэ.
    },
    [next, router, stopTimers],
  );

  const begin = useCallback(async () => {
    stopTimers();
    setStart(null);
    setPhase('starting');

    const res = await postJSON<StartData>('/api/auth/eid/start', {});
    if (!mounted.current) return;

    if (!res.ok || !res.data?.session_id) {
      setPhase('error');
      return;
    }

    const data = res.data;
    setStart(data);
    setPhase('waiting');

    // ~2.5 секунд тутамд төлвийг шалгана.
    pollTimer.current = setInterval(() => {
      void poll(data.session_id);
    }, POLL_INTERVAL_MS);

    // expires_at-ийн дараа автоматаар зогсоож, хугацаа дууссан гэж тэмдэглэнэ.
    const expiresMs = new Date(data.expires_at).getTime() - Date.now();
    if (Number.isFinite(expiresMs) && expiresMs > 0) {
      expiryTimer.current = setTimeout(() => {
        if (!mounted.current) return;
        stopTimers();
        setPhase((p) => (p === 'waiting' ? 'expired' : p));
      }, expiresMs);
    }
  }, [poll, stopTimers]);

  useEffect(() => {
    mounted.current = true;
    void begin();
    return () => {
      mounted.current = false;
      stopTimers();
    };
  }, [begin, stopTimers]);

  const isTerminal = phase === 'expired' || phase === 'refused' || phase === 'error';

  return (
    <div className="form-grid" aria-live="polite">
      {noticeText && <Alert kind="success">{noticeText}</Alert>}

      {phase === 'error' && <Alert kind="danger">{T('auth.eid.startError')}</Alert>}
      {phase === 'expired' && <Alert kind="info">{T('auth.eid.expired')}</Alert>}
      {phase === 'refused' && <Alert kind="danger">{T('auth.eid.refused')}</Alert>}
      {phase === 'success' && <Alert kind="success">{T('auth.eid.success')}</Alert>}

      {phase === 'starting' && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          {T('auth.eid.starting')}
        </p>
      )}

      {phase === 'waiting' && start && (
        <>
          <p className="signin-card__lede" style={{ fontSize: 14, marginTop: -4 }}>
            {T('auth.eid.scanInstruction')}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <div
              style={{
                background: '#fff',
                padding: 16,
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              }}
            >
              <QRCodeSVG value={start.device_link_url} size={196} level="M" includeMargin={false} />
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              {T('auth.eid.verificationCode')}
            </div>
            <div
              className="mono"
              style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, color: 'var(--fg)' }}
            >
              {start.verification_code}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 0 }}>
              {T('auth.eid.verificationHint')}
            </p>
          </div>

          {/* Мобайл дээр App2App — eID апп-ыг шууд нээнэ. */}
          <a
            className="btn btn--secondary btn--block"
            href={start.device_link_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Smartphone size={18} strokeWidth={2} />
            <span>{T('auth.eid.openApp')}</span>
          </a>

          <p
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--muted)',
              fontSize: 13,
              marginBottom: 0,
            }}
          >
            <ShieldCheck size={15} strokeWidth={2} />
            <span>{T('auth.eid.waiting')}</span>
          </p>
        </>
      )}

      {isTerminal && (
        <button className="btn btn--primary btn--lg btn--block" type="button" onClick={() => void begin()}>
          <RefreshCw size={18} strokeWidth={2} />
          <span>{T('auth.eid.retry')}</span>
        </button>
      )}
    </div>
  );
}
