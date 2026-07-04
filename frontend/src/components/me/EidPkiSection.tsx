"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Smartphone, FileSignature, LogIn } from 'lucide-react';
import { useT } from '@/lib/lang';
import { formatTS } from '@/lib/format';
import { pkiGet, type PkiCertItem, type PkiDeviceItem, type PkiActItem } from '@/lib/pki';

/**
 * EidPkiSection нь Profile хуудсанд иргэний eID PKI-ийн ДЭЛГЭРЭНГҮЙ жагсаалтыг
 * харуулна: гэрчилгээ, холбоотой төхөөрөмж, RP-scoped activity. Нэгдсэн тоо
 * (tiles) нь Dashboard дахь EidSummaryCard-д. PKI_READ эрхгүй (403) бол
 * "эрх хүлээгдэж байна"; eID хэрэглэгч биш бол render хийхгүй.
 */
export default function EidPkiSection({ show }: { show: boolean }) {
  const { T, lang } = useT();

  const certs = useQuery({ queryKey: ['eid-pki-certs'], queryFn: () => pkiGet<{ certificates: PkiCertItem[] }>('/api/me/eid/certificates'), enabled: show });
  const devices = useQuery({ queryKey: ['eid-pki-devices'], queryFn: () => pkiGet<{ devices: PkiDeviceItem[] }>('/api/me/eid/devices'), enabled: show });
  const activity = useQuery({ queryKey: ['eid-pki-activity'], queryFn: () => pkiGet<{ sessions: PkiActItem[] }>('/api/me/eid/activity'), enabled: show });

  if (!show) return null;

  const forbidden = certs.data?.status === 403;
  const statusTone = (st: string) => (st === 'VALID' ? 'success' : st === 'REVOKED' ? 'danger' : 'warning');
  const certList = certs.data?.data?.certificates ?? [];
  const devList = devices.data?.data?.devices ?? [];
  const actList = activity.data?.data?.sessions ?? [];

  return (
    <section className="card" aria-label={T('me.pki.title')}>
      <div className="card__head card__head--with-sub">
        <div className="card__title"><h2>{T('me.pki.certList')}</h2></div>
        <span className="card__sub">{T('me.pki.sub')} <span className="mono">eidmongolia.mn/v3</span></span>
      </div>

      {forbidden ? (
        <p className="muted" style={{ padding: '4px 2px' }}>{T('me.pki.pending')}</p>
      ) : (
        <>
          {certList.length > 0 && (
            <div className="pki-list">
              <h3 className="pki-list__title">{T('me.pki.certList')}</h3>
              {certList.map((c) => (
                <div key={c.document_number + c.serial_number} className="pki-row">
                  <ShieldCheck size={15} />
                  <span className="pki-row__main">{c.type} · <span className="mono">{c.serial_number.slice(0, 16)}…</span></span>
                  <span className="chip chip--neutral">{c.certificate_level}</span>
                  <span className={`badge badge--${statusTone(c.status)}`}>{c.status}</span>
                  {c.not_after && <span className="pki-row__meta mono">{formatTS(c.not_after)}</span>}
                </div>
              ))}
            </div>
          )}

          {devList.length > 0 && (
            <div className="pki-list">
              <h3 className="pki-list__title">{T('me.pki.devList')}</h3>
              {devList.map((d) => (
                <div key={d.document_number} className="pki-row">
                  <Smartphone size={15} />
                  <span className="pki-row__main mono">{d.document_number.slice(0, 12)}…</span>
                  {d.platform && <span className="chip chip--neutral">{d.platform}</span>}
                  <span className={`badge badge--${d.active ? 'success' : 'danger'}`}>{d.active ? T('me.pki.active') : T('me.pki.inactive')}</span>
                  {d.enrolled_at && <span className="pki-row__meta mono">{formatTS(d.enrolled_at)}</span>}
                </div>
              ))}
            </div>
          )}

          {actList.length > 0 && (
            <div className="pki-list">
              <h3 className="pki-list__title">{T('me.pki.actList')}</h3>
              {actList.map((a, i) => (
                <div key={i} className="pki-row">
                  {a.flow === 'SIGNATURE' ? <FileSignature size={15} /> : <LogIn size={15} />}
                  <span className="pki-row__main">{lang === 'en' ? a.flow : (a.flow === 'SIGNATURE' ? 'Гарын үсэг' : 'Нэвтрэлт')}</span>
                  <span className={`badge badge--${a.outcome === 'OK' ? 'success' : 'warning'}`}>{a.outcome}</span>
                  {a.timestamp && <span className="pki-row__meta mono">{formatTS(a.timestamp)}</span>}
                </div>
              ))}
            </div>
          )}

          {certList.length === 0 && devList.length === 0 && actList.length === 0 && !certs.isPending && (
            <p className="muted" style={{ padding: '4px 2px' }}>{T('me.pki.none')}</p>
          )}
        </>
      )}
    </section>
  );
}
