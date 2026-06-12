"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, RefreshCw, Fingerprint, QrCode } from 'lucide-react';
import Alert from '@/components/Alert';
import { postJSON } from '@/lib/client';
import { safeNext } from '@/lib/navigation';
import { useT } from '@/lib/lang';

// Хоёр нэвтрэх арга: (A) РД-ээр — иргэний апп руу push мэдэгдэл очиж, тэндээ
// зөвшөөрөхөд desktop browser нэвтэрнэ; (B) QR-ээр — eID апп-аар QR уншуулахад
// desktop browser нэвтэрнэ. Аль ч тохиолдолд утас redirect хийхгүй — desktop
// browser нь poll-оор төлвийг хянаж нэвтэрнэ. Тиймээс QR дээр device_link_url
// руу автоматаар шилжихгүй (зөвхөн гар аргаар дарж болох fallback холбоос).

interface StartData {
  session_id: string;
  device_link_url?: string; // зөвхөн QR арга буцаана
  verification_code: string;
  expires_at: string;
}

type Method = 'id' | 'qr';
type Phase = 'idle' | 'starting' | 'waiting' | 'expired' | 'refused' | 'error' | 'success';

const POLL_INTERVAL_MS = 2500;

export default function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const router = useRouter();
  const { T } = useT();

  const [method, setMethod] = useState<Method>('id');
  const [phase, setPhase] = useState<Phase>('idle');
  const [start, setStart] = useState<StartData | null>(null);
  const [nationalId, setNationalId] = useState('');
  const [idError, setIdError] = useState('');

  // unmount хийсний дараа интервалд timer-уудыг цэвэрлэхэд ашиглана.
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  // Сүүлд эхлүүлсэн арга — terminal төлөвт retry хийхэд ашиглана.
  const lastMethod = useRef<Method>('id');

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

  // start өгөгдөл хүлээн авсны дараа poll болон expiry timer-уудыг тохируулна.
  const armSession = useCallback(
    (data: StartData) => {
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
    },
    [poll, stopTimers],
  );

  // QR арга — backend-ээс device_link_url-тэй start авна.
  const beginQr = useCallback(async () => {
    stopTimers();
    setStart(null);
    setIdError('');
    lastMethod.current = 'qr';
    setPhase('starting');

    const res = await postJSON<StartData>('/api/auth/eid/start', {});
    if (!mounted.current) return;

    if (!res.ok || !res.data?.session_id) {
      setPhase('error');
      return;
    }
    armSession(res.data);
  }, [armSession, stopTimers]);

  // РД арга — backend иргэний апп руу push мэдэгдэл илгээнэ (device_link_url алга).
  const beginId = useCallback(async () => {
    const rd = nationalId.trim();
    if (!rd) {
      setIdError(T('auth.eid.nationalIdRequired'));
      return;
    }

    stopTimers();
    setStart(null);
    setIdError('');
    lastMethod.current = 'id';
    setPhase('starting');

    const res = await postJSON<StartData>('/api/auth/eid/start-id', { national_id: rd });
    if (!mounted.current) return;

    if (!res.ok || !res.data?.session_id) {
      setPhase('error');
      return;
    }
    armSession(res.data);
  }, [armSession, nationalId, stopTimers, T]);

  // Terminal төлөвт сүүлд хэрэглэсэн аргаар дахин эхлүүлнэ.
  const retry = useCallback(() => {
    if (lastMethod.current === 'qr') void beginQr();
    else void beginId();
  }, [beginQr, beginId]);

  // Арга солих — идэвхтэй session-ыг зогсоож, цэвэр idle төлөвт оруулна.
  const switchMethod = useCallback(
    (m: Method) => {
      if (m === method) return;
      stopTimers();
      setStart(null);
      setIdError('');
      setPhase('idle');
      setMethod(m);
      // QR аргыг сонгомогц шууд эхлүүлнэ; РД нь дугаар оруулахыг шаардана.
      if (m === 'qr') void beginQr();
    },
    [method, stopTimers, beginQr],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopTimers();
    };
  }, [stopTimers]);

  const isTerminal = phase === 'expired' || phase === 'refused' || phase === 'error';
  const busy = phase === 'starting' || phase === 'waiting';

  return (
    <div className="form-grid" aria-live="polite">
      {noticeText && <Alert kind="success">{noticeText}</Alert>}

      {/* Нэвтрэх аргын сонголт */}
      <div className="segmented" role="tablist" style={{ display: 'flex', width: '100%' }}>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'id'}
          className={`segmented__item${method === 'id' ? ' is-active' : ''}`}
          style={{ flex: 1 }}
          onClick={() => switchMethod('id')}
        >
          <Fingerprint size={14} strokeWidth={2} />
          <span>{T('auth.eid.methodId')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'qr'}
          className={`segmented__item${method === 'qr' ? ' is-active' : ''}`}
          style={{ flex: 1 }}
          onClick={() => switchMethod('qr')}
        >
          <QrCode size={14} strokeWidth={2} />
          <span>{T('auth.eid.methodQr')}</span>
        </button>
      </div>

      {phase === 'error' && <Alert kind="danger">{T('auth.eid.startError')}</Alert>}
      {phase === 'expired' && <Alert kind="info">{T('auth.eid.expired')}</Alert>}
      {phase === 'refused' && <Alert kind="danger">{T('auth.eid.refused')}</Alert>}
      {phase === 'success' && <Alert kind="success">{T('auth.eid.success')}</Alert>}

      {phase === 'starting' && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          {T('auth.eid.starting')}
        </p>
      )}

      {/* РД арга — дугаар оруулах форм (хүлээх төлөвт орох хүртэл) */}
      {method === 'id' && phase !== 'waiting' && phase !== 'starting' && (
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            void beginId();
          }}
        >
          <label className="field__label" htmlFor="eid-national-id">
            {T('auth.eid.nationalIdLabel')}
          </label>
          <input
            id="eid-national-id"
            className="input mono"
            value={nationalId}
            onChange={(e) => {
              setNationalId(e.target.value);
              if (idError) setIdError('');
            }}
            placeholder={T('auth.eid.nationalIdPlaceholder')}
            aria-invalid={idError ? 'true' : undefined}
            autoComplete="off"
            autoFocus
          />
          {idError && <span className="field__error">{idError}</span>}
          <button className="btn btn--primary btn--lg btn--block" type="submit" style={{ marginTop: 4 }}>
            <Fingerprint size={18} strokeWidth={2} />
            <span>{T('auth.eid.submit')}</span>
          </button>
        </form>
      )}

      {/* РД арга — push илгээсэн хүлээх төлөв */}
      {method === 'id' && phase === 'waiting' && start && (
        <>
          <p className="signin-card__lede" style={{ fontSize: 14, marginTop: -4 }}>
            {T('auth.eid.pushSent')}
          </p>

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
              {T('auth.eid.pushHint')}
            </p>
          </div>

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

      {/* QR арга — QR код + баталгаажуулах код (хүлээх төлөв) */}
      {method === 'qr' && phase === 'waiting' && start?.device_link_url && (
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
        <button
          className="btn btn--primary btn--lg btn--block"
          type="button"
          onClick={retry}
          disabled={busy}
        >
          <RefreshCw size={18} strokeWidth={2} />
          <span>{T('auth.eid.retry')}</span>
        </button>
      )}
    </div>
  );
}
