"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useT } from '@/lib/lang';
import { getJSON } from '@/lib/client';
import { formatTS } from '@/lib/format';

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
 * байгууллагуудыг харуулна (GET /api/me/eid/organizations). Зөвхөн eID-ээр
 * нэвтэрсэн хэрэглэгчид өгөгдөлтэй; бусад/хоосон үед тайлбар мессеж.
 */
export default function OrgRepsCard({ show }: { show: boolean }) {
  const { T, lang } = useT();
  const q = useQuery({
    queryKey: ['eid-organizations'],
    queryFn: () => getJSON<OrgRep[]>('/api/me/eid/organizations'),
    enabled: show,
  });

  if (!show) return null;

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
            <div key={o.org_etsi} className="org-rep">
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
