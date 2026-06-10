"use client";

import React from 'react';
import Link from 'next/link';
import { User, Mail, ShieldCheck, Clock, Hash, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/lang';
import { roleLabel, type SessionUser } from '@/lib/types';
import { formatTS, initialsOf } from '@/lib/format';

export default function ProfileView({ me }: { me: SessionUser }) {
  const { T, lang } = useT();
  const initials = initialsOf(me.username);

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
              <span className="profile-card__name-text">{me.fullName}</span>
              <span className="badge badge--primary">{roleLabel(me.roleId, lang)}</span>
            </div>
            <div className="profile-card__sub">
              <span className="mono">{me.email}</span>
            </div>
          </div>
          <div className="profile-card__action">
            <Link className="btn btn--secondary" href="/settings">{T('me.profile.changePw')}</Link>
          </div>
        </div>
      </section>

      <section className="card" aria-label={T('me.profile.fields')}>
        <div className="card__head card__head--with-sub">
          <div className="card__title"><h2>{T('me.profile.fields')}</h2></div>
          <span className="card__sub">{T('me.profile.fieldsSub')}</span>
        </div>

        <div>
          <div className="defrow">
            <span className="defrow__label"><Hash size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.id')}</span>
            <span className="defrow__value mono">{me.id}</span>
          </div>
          <div className="defrow">
            <span className="defrow__label"><User size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.lastName')}</span>
            <span className="defrow__value">{me.lastName || '—'}</span>
          </div>
          <div className="defrow">
            <span className="defrow__label"><User size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.firstName')}</span>
            <span className="defrow__value">{me.firstName || '—'}</span>
          </div>
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
            <span className="defrow__value">
              <span className="chip chip--neutral">role_id {me.roleId}</span> {roleLabel(me.roleId, lang)}
            </span>
          </div>
          <div className="defrow">
            <span className="defrow__label"><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.created')}</span>
            <span className="defrow__value mono">{formatTS(me.createdAt)}</span>
          </div>
          <div className="defrow">
            <span className="defrow__label"><RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{T('me.field.updated')}</span>
            <span className="defrow__value mono">{me.updatedAt ? formatTS(me.updatedAt) : '—'}</span>
          </div>
        </div>
      </section>
    </>
  );
}
