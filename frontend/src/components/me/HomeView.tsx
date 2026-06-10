"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight, User, ShieldCheck, KeyRound, Info, Mail, Clock } from 'lucide-react';
import { useT } from '@/lib/lang';
import { roleLabel, type SessionUser } from '@/lib/types';
import { formatDateMN, formatTS, formatWeekdayMN, initialsOf } from '@/lib/format';

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
        <h1>{T('me.home.greeting')}, {me.username}</h1>
        <p className="page-head__sub">
          {formatDateMN(today)}, {formatWeekdayMN(today)} · <span className="mono">UTC+08</span>
        </p>
      </div>

      <section className="card" aria-label={T('me.card.profile.title')}>
        <div className="profile-card">
          <div className="profile-card__avatar" aria-hidden="true">{initials}</div>
          <div className="profile-card__body">
            <div className="profile-card__name">
              <span className="profile-card__name-text">{me.username}</span>
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

      <section className="card" aria-label={T('me.home.accountDetails')} style={{ marginTop: 16 }}>
        <div className="card__head card__head--with-sub">
          <div className="card__title">
            <Info size={18} strokeWidth={2} style={{ color: 'var(--dan-blue-text)' }} />
            <h2>{T('me.home.accountDetails')}</h2>
          </div>
          <span className="card__sub">gerege-backend-template-v27 · GET /users/me</span>
        </div>
        <div>
          <div className="defrow">
            <span className="defrow__label"><User size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.username')}</span>
            <span className="defrow__value">{me.username}</span>
          </div>
          <div className="defrow">
            <span className="defrow__label"><Mail size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.email')}</span>
            <span className="defrow__value mono">{me.email}</span>
          </div>
          <div className="defrow">
            <span className="defrow__label"><ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.role')}</span>
            <span className="defrow__value"><span className="chip chip--neutral">role_id {me.roleId}</span> {roleLabel(me.roleId, lang)}</span>
          </div>
          <div className="defrow">
            <span className="defrow__label"><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.created')}</span>
            <span className="defrow__value mono">{formatTS(me.createdAt)}</span>
          </div>
        </div>
      </section>

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
