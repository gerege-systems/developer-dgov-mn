"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight, User, ShieldCheck, KeyRound } from 'lucide-react';
import { useT } from '@/lib/lang';
import { roleLabel, displayName, type SessionUser } from '@/lib/types';
import { formatDateMN, formatTS, formatWeekdayMN, initialsOf } from '@/lib/format';
import EidSummaryCard from './EidSummaryCard';

export default function HomeView({ me }: { me: SessionUser }) {
  const { T, lang } = useT();
  const today = new Date();
  const initials = initialsOf(me.username);

  const cards = [
    { href: '/profile', eyebrow: T('me.card.profile.eyebrow'), title: T('me.card.profile.title'), desc: T('me.card.profile.desc'), icon: User },
    { href: '/settings', eyebrow: T('me.card.security.eyebrow'), title: T('me.card.security.title'), desc: T('me.card.security.desc'), icon: ShieldCheck },
  ];

  return (
    <>
      <div className="page-head">
        <span className="page-head__eyebrow">{T('me.home.eyebrow')}</span>
        <h1>{T('me.home.greeting')}, {displayName(me, lang)}</h1>
        <p className="page-head__sub">
          {formatDateMN(today)}, {formatWeekdayMN(today)} · <span className="mono">UTC+08</span>
        </p>
      </div>

      <section className="card" aria-label={T('me.card.profile.title')}>
        <div className="profile-card">
          <div className="profile-card__avatar" aria-hidden="true">{initials}</div>
          <div className="profile-card__body">
            <div className="profile-card__name">
              <span className="profile-card__name-text">{displayName(me, lang)}</span>
              <span className="badge badge--primary">{roleLabel(me.roleId, lang)}</span>
            </div>
            <div className="profile-card__sub">
              <span className="mono">{me.email}</span>
              <span className="dot" />
              <span>{T('me.field.created')} <span className="mono">{formatTS(me.createdAt)}</span></span>
            </div>
          </div>
          <div className="profile-card__action">
            <Link className="btn btn--secondary" href="/profile">{T('me.home.viewProfile')}</Link>
          </div>
        </div>
      </section>

      {me.google && (
        <section className="card" aria-label={T('me.google.title')} style={{ marginTop: 16 }}>
          <div className="card__head card__head--with-sub">
            <div className="card__title">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-17z"/><path fill="#FBBC05" d="M10.4 28.3a14.5 14.5 0 0 1 0-8.6l-7.8-6.1a24 24 0 0 0 0 20.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.2-8.8 2.2-6.4 0-11.8-3.8-13.6-9.3l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              <h2>{T('me.google.title')}</h2>
            </div>
            <span className="card__sub">Google OAuth · linked account</span>
          </div>

          <div className="profile-card" style={{ marginBottom: 4 }}>
            {me.google.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="profile-card__avatar" src={me.google.picture} alt="" width={44} height={44} style={{ objectFit: 'cover', padding: 0 }} referrerPolicy="no-referrer" />
            ) : (
              <div className="profile-card__avatar" aria-hidden="true">{initialsOf(me.google.name || me.google.email || 'G')}</div>
            )}
            <div className="profile-card__body">
              <div className="profile-card__name">
                <span className="profile-card__name-text">{me.google.name || T('me.google.noName')}</span>
                {me.google.emailVerified ? (
                  <span className="badge badge--success">{T('me.google.verified')}</span>
                ) : (
                  <span className="chip chip--neutral">{T('me.google.unverified')}</span>
                )}
              </div>
              <div className="profile-card__sub">
                <span className="mono">{me.google.email}</span>
                {me.google.linkedAt && (
                  <>
                    <span className="dot" />
                    <span>{T('me.google.linkedAt')} <span className="mono">{formatTS(me.google.linkedAt)}</span></span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* eID PKI-ийн нэгдсэн тоо (гэрчилгээ/нэвтрэлт/төхөөрөмж) — бодит өгөгдөл */}
      <EidSummaryCard show={!!me.eid} />

      <div className="section-divider">{T('me.home.sections')}</div>

      <div className="card-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="card" style={{ padding: 20, textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--dan-blue-soft)', color: 'var(--dan-blue-text)' }}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                <span className="page-head__eyebrow">{c.eyebrow}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{c.title}</h3>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{c.desc}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--dan-blue-text)' }}>
                {T('me.home.open')} <ChevronRight size={12} strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="trust-strip" style={{ marginTop: 22 }}>
        <span className="trust-strip__item">
          <KeyRound size={12} strokeWidth={2.5} style={{ color: 'var(--dan-blue)' }} />
          JWT access + refresh
        </span>
        <span className="trust-strip__dot">·</span>
        <span className="trust-strip__item">bcrypt</span>
        <span className="trust-strip__dot">·</span>
        <span className="trust-strip__item">chi + pgx</span>
        <span className="trust-strip__dot">·</span>
        <span className="trust-strip__item mono">TLS 1.3</span>
      </div>

      <footer className="footer" style={{ justifyContent: 'center', textAlign: 'center', marginTop: 12 }}>
        <span>© 2026 Gerege Systems · <span className="mono">Gerege Template</span></span>
      </footer>
    </>
  );
}
