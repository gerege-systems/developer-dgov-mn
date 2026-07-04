"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React from 'react';
import { Fingerprint, Hash, Contact, ShieldCheck, Smartphone, User } from 'lucide-react';
import { useT } from '@/lib/lang';
import type { EIDInfo } from '@/lib/types';
import { DefRow } from './DefRow';

/**
 * EidCard нь eidmongolia.mn-ээс login үед авсан иргэний identity-г харуулна:
 * иргэний бүртгэлийн дугаар, регистр, баталгаажуулалтын түвшин, төхөөрөмжийн
 * дугаар, латин нэр. eID мэдээлэлгүй (нууц үгээр нэвтэрсэн) хэрэглэгчид
 * тайлбар мессеж харуулна.
 */
export default function EidCard({ eid, nameLatin }: { eid?: EIDInfo; nameLatin: string }) {
  const { T } = useT();

  return (
    <section className="card" aria-label={T('me.eid.title')}>
      <div className="card__head card__head--with-sub">
        <div className="card__title"><h2>{T('me.eid.title')}</h2></div>
        <span className="card__sub">{T('me.eid.sub')} <span className="mono">eidmongolia.mn/v3</span></span>
      </div>

      {!eid ? (
        <p className="muted" style={{ padding: '4px 2px' }}>{T('me.eid.none')}</p>
      ) : (
        <div>
          {eid.civilId && (
            <DefRow icon={Contact} label={T('me.eid.civilId')} mono>{eid.civilId.toUpperCase()}</DefRow>
          )}
          {eid.nationalId && (
            <DefRow icon={Hash} label={T('me.eid.nationalId')} mono>{eid.nationalId.toUpperCase()}</DefRow>
          )}
          {nameLatin && (
            <DefRow icon={User} label={T('me.eid.nameLatin')}>{nameLatin}</DefRow>
          )}
          {eid.kycLevel && (
            <DefRow icon={ShieldCheck} label={T('me.eid.kyc')}>
              <span className="chip chip--neutral">{eid.kycLevel}</span>
            </DefRow>
          )}
          {eid.documentNumber && (
            <DefRow icon={Smartphone} label={T('me.eid.docNumber')} mono>{eid.documentNumber}</DefRow>
          )}
          {!eid.civilId && !eid.nationalId && !eid.documentNumber && (
            <DefRow icon={Fingerprint} label={T('me.eid.title')}>—</DefRow>
          )}
        </div>
      )}
    </section>
  );
}
