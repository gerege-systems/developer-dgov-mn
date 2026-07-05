"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React from 'react';
import Link from 'next/link';
import { User, Mail, ShieldCheck, Clock, Hash, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/lang';
import { roleLabel, displayName, type SessionUser } from '@/lib/types';
import { formatTS, initialsOf } from '@/lib/format';
import { DefRow } from './DefRow';
import EidCard from './EidCard';
import CertCard from './CertCard';
import EidSummaryCard from './EidSummaryCard';
import EidPkiSection from './EidPkiSection';

/**
 * ProfileView нь /me/profile хуудсын гол харагдац. Дээд талд профайл карт
 * (бүтэн өргөн), дараа нь eID PKI-ийн нэгдсэн хураангуй (EidSummaryCard),
 * дараа нь 2 баганат grid-д: бүртгэлийн талбарууд, eID таних мэдээлэл, тоон
 * гэрчилгээ. Хамгийн доор eID гэрчилгээ/төхөөрөмж/үйл ажиллагааны дэлгэрэнгүй
 * жагсаалт (EidPkiSection). Төлөөлдөг байгууллага нь Байгууллага хуудсанд.
 */
export default function ProfileView({ me }: { me: SessionUser }) {
  const { T, lang } = useT();
  const initials = initialsOf(me.username);
  const nameLatin = `${me.lastNameEn} ${me.firstNameEn}`.trim();

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">{T('me.profile.eyebrow')}</span>
        <h1>{T('me.profile.title')}</h1>
        <p className="page-head__sub">{T('me.profile.sub')} <span className="mono">GET /users/me</span>.</p>
      </div>

      <section className="card" aria-label={T('me.profile.title')}>
        <div className="profile-card">
          <div className="profile-card__avatar" aria-hidden="true">{initials}</div>
          <div className="profile-card__body">
            <div className="profile-card__name">
              <span className="profile-card__name-text">{displayName(me, lang)}</span>
              <span className="badge badge--primary">{roleLabel(me.roleId, lang)}</span>
            </div>
            <div className="profile-card__sub">
              <span className="mono">{me.email || me.username}</span>
            </div>
          </div>
          <div className="profile-card__action">
            <Link className="btn btn--secondary" href="/settings">{T('me.profile.changePw')}</Link>
          </div>
        </div>
      </section>

      <EidSummaryCard show={!!me.eid} />

      <div className="profile-grid">
        <section className="card" aria-label={T('me.profile.fields')}>
          <div className="card__head card__head--with-sub">
            <div className="card__title"><h2>{T('me.profile.fields')}</h2></div>
            <span className="card__sub">{T('me.profile.fieldsSub')}</span>
          </div>

          <div>
            <DefRow icon={Hash} label={T('me.field.id')} mono>{me.id}</DefRow>
            <DefRow icon={User} label={T('me.field.lastName')}>{(lang === 'en' ? me.lastNameEn : me.lastName) || '—'}</DefRow>
            <DefRow icon={User} label={T('me.field.firstName')}>{(lang === 'en' ? me.firstNameEn : me.firstName) || '—'}</DefRow>
            <DefRow icon={User} label={T('me.field.username')}>{me.username}</DefRow>
            <DefRow icon={Mail} label={T('me.field.email')} mono>{me.email || '—'}</DefRow>
            <DefRow icon={ShieldCheck} label={T('me.field.role')}>
              <span className="chip chip--neutral">role_id {me.roleId}</span> {roleLabel(me.roleId, lang)}
            </DefRow>
            <DefRow icon={Clock} label={T('me.field.created')} mono>{formatTS(me.createdAt)}</DefRow>
            <DefRow icon={RefreshCw} label={T('me.field.updated')} mono>{me.updatedAt ? formatTS(me.updatedAt) : '—'}</DefRow>
          </div>
        </section>

        <EidCard eid={me.eid} nameLatin={nameLatin} />
        <CertCard eid={me.eid} />
      </div>

      <EidPkiSection show={!!me.eid} />
    </>
  );
}
