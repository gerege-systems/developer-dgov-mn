"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React from 'react';
import { CalendarClock, Building2, Hash, KeyRound, ShieldCheck } from 'lucide-react';
import { useT } from '@/lib/lang';
import type { EIDInfo } from '@/lib/types';
import { formatTS } from '@/lib/format';
import { DefRow } from './DefRow';

/** Хугацаа дуустал үлдсэн хоног (сөрөг бол дууссан). */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

/**
 * CertCard нь login үед хүлээн авсан X.509 сертификатын нээлттэй хэсгийг
 * харуулна: серийн дугаар, хүчинтэй хугацаа (үлдсэн хоногийн badge-тэй),
 * олгогч CA, түлхүүрийн төрөл. Сертификатгүй бол огт render хийхгүй (null).
 */
export default function CertCard({ eid }: { eid?: EIDInfo }) {
  const { T } = useT();
  const cert = eid?.certificate;
  if (!cert) return null;

  const left = daysUntil(cert.notAfter);
  const status =
    left === null ? null : left < 0
      ? { cls: 'badge--danger', text: T('me.cert.expired') }
      : left < 30
        ? { cls: 'badge--warning', text: `${left} ${T('me.cert.expiresIn')}` }
        : { cls: 'badge--success', text: T('me.cert.valid') };

  return (
    <section className="card" aria-label={T('me.cert.title')}>
      <div className="card__head card__head--with-sub">
        <div className="card__title">
          <h2>{T('me.cert.title')}</h2>
          {status && <span className={`badge ${status.cls}`} style={{ marginLeft: 8 }}>{status.text}</span>}
        </div>
        <span className="card__sub">{T('me.cert.sub')}</span>
      </div>

      <div>
        {cert.serial && <DefRow icon={Hash} label={T('me.cert.serial')} mono>{cert.serial}</DefRow>}
        {cert.notBefore && (
          <DefRow icon={CalendarClock} label={T('me.cert.validFrom')} mono>{formatTS(cert.notBefore)}</DefRow>
        )}
        {cert.notAfter && (
          <DefRow icon={CalendarClock} label={T('me.cert.validUntil')} mono>{formatTS(cert.notAfter)}</DefRow>
        )}
        {cert.issuer && <DefRow icon={Building2} label={T('me.cert.issuer')}>{cert.issuer}</DefRow>}
        {cert.keyType && (
          <DefRow icon={KeyRound} label={T('me.cert.keyType')}>
            <span className="chip chip--neutral">{cert.keyType}</span>
          </DefRow>
        )}
        {!cert.serial && !cert.notAfter && (
          <DefRow icon={ShieldCheck} label={T('me.cert.title')}>—</DefRow>
        )}
      </div>
    </section>
  );
}
