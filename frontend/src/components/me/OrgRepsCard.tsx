"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, ChevronRight } from 'lucide-react';
import { useT } from '@/lib/lang';
import { getJSON, postJSON } from '@/lib/client';
import { formatTS } from '@/lib/format';
import Alert from '@/components/Alert';

interface OrgRep {
  org_etsi: string;
  org_register: string;
  org_name: string;
  org_name_en?: string;
  role?: string;
  right_type?: string;
  valid_from?: string;
  valid_to?: string;
}

/**
 * OrgRepsCard нь нэвтэрсэн иргэний eidmongolia.mn-д бүртгэлтэй, төлөөлж чадах
 * байгууллагуудыг ЖАГСААЛТААР харуулна. Карт тус бүрийг дарахад тухайн байгууллагын
 * удирдах дэлгэц рүү (гарын үсэг зурагч нэмэх/хасах, салгах) шилжинэ. Мөн регистрийн
 * дугаараар шинэ байгууллага холбох форм. Зөвхөн eID-ээр нэвтэрсэн хэрэглэгчид.
 */
export default function OrgRepsCard({ show }: { show: boolean }) {
  const { T, lang } = useT();
  const qc = useQueryClient();
  const [regNo, setRegNo] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const q = useQuery({
    queryKey: ['eid-organizations'],
    queryFn: () => getJSON<OrgRep[]>('/api/me/eid/organizations'),
    enabled: show,
  });

  const add = useMutation({
    mutationFn: async (reg: string) => {
      const res = await postJSON<OrgRep[]>('/api/me/eid/organizations', { reg_no: reg });
      if (!res.ok) throw new Error(res.message || T('me.orgs.add.error'));
      return res.data ?? [];
    },
    onSuccess: (data) => {
      qc.setQueryData(['eid-organizations'], data);
      setRegNo('');
      setOkMsg(T('me.orgs.add.success'));
    },
  });

  if (!show) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const reg = regNo.trim();
    setOkMsg('');
    if (reg) add.mutate(reg);
  };

  return (
    <section className="card" aria-label={T('me.orgs.title')}>
      <div className="card__head card__head--with-sub">
        <div className="card__title"><h2>{T('me.orgs.title')}</h2></div>
        <span className="card__sub">{T('me.orgs.sub')} <span className="mono">eidmongolia.mn/v3</span></span>
      </div>

      {q.isPending ? (
        <p className="muted" style={{ padding: '4px 2px' }}>{T('me.orgs.loading')}</p>
      ) : q.isError ? (
        <p className="muted" style={{ padding: '4px 2px' }}>{T('me.orgs.error')}</p>
      ) : !q.data || q.data.length === 0 ? (
        <p className="muted" style={{ padding: '4px 2px' }}>{T('me.orgs.none')}</p>
      ) : (
        <div className="org-reps">
          {q.data.map((o) => (
            <Link
              key={o.org_etsi}
              href={`/me/organizations/eid/${encodeURIComponent(o.org_register)}`}
              className="org-rep org-rep--link"
              aria-label={`${o.org_name} — ${T('me.orgs.manage')}`}
            >
              <div className="org-rep__icon" aria-hidden="true"><Building2 size={18} /></div>
              <div className="org-rep__body">
                <div className="org-rep__name">
                  {(lang === 'en' && o.org_name_en) ? o.org_name_en : o.org_name}
                  {o.right_type && <span className="chip chip--neutral" style={{ marginLeft: 8 }}>{o.right_type}</span>}
                </div>
                <div className="org-rep__meta mono">
                  {o.org_register}
                  {o.role ? ` · ${o.role}` : ''}
                  {o.valid_to ? ` · ${T('me.orgs.until')} ${formatTS(o.valid_to)}` : ''}
                </div>
              </div>
              <ChevronRight size={18} className="org-rep__chevron" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}

      {/* Регистрийн дугаараар байгууллага холбох */}
      <form className="org-add" onSubmit={submit} style={{ marginTop: 16 }}>
        <label htmlFor="org-reg-no" className="org-add__label">{T('me.orgs.add.label')}</label>
        <div className="org-add__row" style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            id="org-reg-no"
            className="input mono"
            style={{ flex: 1 }}
            inputMode="numeric"
            autoComplete="off"
            placeholder={T('me.orgs.add.placeholder')}
            value={regNo}
            onChange={(e) => { setRegNo(e.target.value); setOkMsg(''); if (add.isError) add.reset(); }}
            disabled={add.isPending}
            maxLength={16}
          />
          <button type="submit" className="btn btn--primary" disabled={add.isPending || regNo.trim().length < 4}>
            <Plus size={16} strokeWidth={2} />
            <span>{add.isPending ? T('me.orgs.add.submitting') : T('me.orgs.add.button')}</span>
          </button>
        </div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>{T('me.orgs.add.hint')}</p>
        {add.isError && <div style={{ marginTop: 8 }}><Alert kind="danger">{(add.error as Error).message}</Alert></div>}
        {okMsg && <div style={{ marginTop: 8 }}><Alert kind="success">{okMsg}</Alert></div>}
      </form>
    </section>
  );
}
