"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React, { useEffect, useRef, useState } from 'react';
import { PenLine, Upload, FileText, ShieldCheck, Download, RotateCcw, Clock, Smartphone } from 'lucide-react';
import { CSRF_HEADER } from '@/lib/client';

type Phase =
  | { kind: 'idle' }
  | { kind: 'uploading'; filename: string }
  | { kind: 'waiting'; sessionID: string; filename: string; documentHash: string; verificationCode: string }
  | { kind: 'completed'; sessionID: string; filename: string }
  | { kind: 'error'; msg: string };

// Иргэний хувийн PDF гарын үсэг (PIN2): файл сонгох → баталгаажуулах код →
// Gerege App-аас PIN2 → poll → гарын үсэгтэй PDF татах. Байгууллагын тамга
// (org seal) энэ template-д байхгүй — зөвхөн хувь хүний урсгал.
export default function EidSignView() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll /api/sign/[id] until completed.
  useEffect(() => {
    if (phase.kind !== 'waiting') return;
    const sid = phase.sessionID;
    const fname = phase.filename;
    pollTimer.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/sign/${encodeURIComponent(sid)}`, { cache: 'no-store' });
        const data = await r.json();
        if (data.state === 'completed') {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPhase({ kind: 'completed', sessionID: sid, filename: fname });
        } else if (data.state === 'failed' || data.state === 'expired' || data.state === 'rejected') {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPhase({ kind: 'error', msg: data.state === 'expired' ? 'Хугацаа дууссан' : 'Гарын үсэг зурахаас татгалзлаа' });
        }
      } catch {
        /* transient — keep polling */
      }
    }, 1500);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [phase]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setPhase({ kind: 'error', msg: 'PDF файл оруулна уу' });
      return;
    }
    setPhase({ kind: 'uploading', filename: f.name });
    try {
      const fd = new FormData();
      fd.set('file', f, f.name);
      // Multipart body postJSON-оор явуулж болохгүй тул CSRF header-г шууд тавина
      // (lib/bff.ts checkOrigin шаарддаг; lib/client.ts-тэй ижил header).
      const r = await fetch('/api/sign/init', { method: 'POST', headers: { [CSRF_HEADER]: '1' }, body: fd });
      const data = await r.json();
      if (!r.ok) {
        setPhase({ kind: 'error', msg: data?.error ?? data?.message ?? 'Илгээж чадсангүй' });
        return;
      }
      setPhase({
        kind: 'waiting',
        sessionID: data.session_id,
        filename: data.filename ?? f.name,
        documentHash: data.document_hash ?? '',
        verificationCode: data.verification_code ?? '',
      });
    } catch (err) {
      setPhase({ kind: 'error', msg: String(err) });
    }
  }

  function reset() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setPhase({ kind: 'idle' });
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={onFile} />

      {/* IDLE — file pick */}
      {phase.kind === 'idle' && (
        <section className="card">
          <div className="card__head card__head--with-sub">
            <div className="card__title"><PenLine size={18} strokeWidth={2} style={{ color: 'var(--dan-blue-text)' }} /><h2>Баримт сонгох</h2></div>
          </div>
          <div style={{ textAlign: 'center', padding: '28px 16px' }}>
            <button type="button" className="btn btn--primary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} style={{ marginRight: 8 }} /> PDF файл сонгох
            </button>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>Зөвхөн PDF, дээд тал нь 25 MB.</p>
          </div>
        </section>
      )}

      {/* UPLOADING */}
      {phase.kind === 'uploading' && (
        <section className="card" style={{ textAlign: 'center', padding: 32 }}>
          <Clock size={28} style={{ color: 'var(--dan-blue-text)' }} />
          <p style={{ fontWeight: 600, color: 'var(--fg)', marginTop: 12 }}>Илгээж байна…</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {phase.filename}</p>
        </section>
      )}

      {/* WAITING — verification code + confirm in app */}
      {phase.kind === 'waiting' && (
        <section className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--dan-blue-soft)', color: 'var(--dan-blue-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={28} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginTop: 14 }}>Утсаараа баталгаажуулна уу</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {phase.filename}</p>
          {phase.verificationCode && (
            <>
              <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 18 }}>Баталгаажуулах код</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
                {phase.verificationCode.split('').map((c, i) => (
                  <span key={i} className="mono" style={{ width: 46, height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'var(--dan-blue-text)', background: 'var(--surface-2)', borderRadius: 12 }}>{c}</span>
                ))}
              </div>
            </>
          )}
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 18, maxWidth: 360, marginInline: 'auto', lineHeight: 1.6 }}>
            Gerege App-даа энэ кодыг шалгаад <strong>PIN2</strong>-оор гарын үсэг зурна уу.
          </p>
          <button type="button" className="btn btn--secondary" onClick={reset} style={{ marginTop: 18 }}>
            <RotateCcw size={15} style={{ marginRight: 6 }} /> Болих
          </button>
        </section>
      )}

      {/* COMPLETED — download */}
      {phase.kind === 'completed' && (
        <section className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--dan-blue-soft)', color: 'var(--dan-blue-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginTop: 14 }}>Гарын үсэг амжилттай зурлаа</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{phase.filename}</p>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="btn btn--primary" href={`/api/sign/${encodeURIComponent(phase.sessionID)}/download`}>
              <Download size={16} style={{ marginRight: 8 }} /> Татаж авах
            </a>
            <button type="button" className="btn btn--secondary" onClick={reset}>
              <RotateCcw size={15} style={{ marginRight: 6 }} /> Шинээр зурах
            </button>
          </div>
        </section>
      )}

      {/* ERROR */}
      {phase.kind === 'error' && (
        <section className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontWeight: 600, color: 'var(--danger, #dc2626)' }}>{phase.msg}</p>
          <button type="button" className="btn btn--secondary" onClick={reset} style={{ marginTop: 16 }}>
            <RotateCcw size={15} style={{ marginRight: 6 }} /> Дахин оролдох
          </button>
        </section>
      )}
    </>
  );
}
