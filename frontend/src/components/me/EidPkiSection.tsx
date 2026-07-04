"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Smartphone, KeyRound, FileSignature, LogIn, Building2 } from 'lucide-react';
import { useT } from '@/lib/lang';
import { formatTS } from '@/lib/format';

// pkiGet нь backend PKI endpoint-ыг дуудаж, {ok,status,data}-г бүрэн буцаана.
// getJSON нь status алддаг тул 403-ыг (PKI_READ эрхгүй) ялгахын тулд шууд fetch.
async function pkiGet<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(path, { method: 'GET' });
  const body = await res.json().catch(() => null);
  return { status: body?.status ?? res.status, data: (body?.ok ? body.data : null) as T | null };
}

interface Summary {
  certificates: { valid: number; revoked: number; expired: number; total: number };
  activity: { authentication: number; signature: number };
  devices_active: number;
  devices_total: number;
  representation_count: number;
}
interface CertItem { document_number: string; type: string; serial_number: string; certificate_level: string; status: string; not_after?: string; }
interface DeviceItem { document_number: string; platform?: string; active: boolean; enrolled_at?: string; }
interface ActItem { flow: string; outcome: string; timestamp?: string; }

function Tile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className={`pki-tile${tone ? ` pki-tile--${tone}` : ''}`}>
      <div className="pki-tile__icon" aria-hidden="true">{icon}</div>
      <div className="pki-tile__value">{value}</div>
      <div className="pki-tile__label">{label}</div>
    </div>
  );
}

/**
 * EidPkiSection нь иргэний eID PKI самбарыг харуулна: нэгдсэн тоо (tiles),
 * гэрчилгээний жагсаалт, холбоотой төхөөрөмж, RP-scoped activity. PKI_READ эрх
 * олгогдоогүй (403) бол "эрх хүлээгдэж байна" тайлбар харуулна (алдаа биш).
 * Зөвхөн eID-ээр нэвтэрсэн хэрэглэгчид (show) render хийнэ.
 */
export default function EidPkiSection({ show }: { show: boolean }) {
  const { T, lang } = useT();

  const summary = useQuery({ queryKey: ['eid-pki-summary'], queryFn: () => pkiGet<Summary>('/api/me/eid/summary'), enabled: show });
  const certs = useQuery({ queryKey: ['eid-pki-certs'], queryFn: () => pkiGet<{ certificates: CertItem[] }>('/api/me/eid/certificates'), enabled: show });
  const devices = useQuery({ queryKey: ['eid-pki-devices'], queryFn: () => pkiGet<{ devices: DeviceItem[] }>('/api/me/eid/devices'), enabled: show });
  const activity = useQuery({ queryKey: ['eid-pki-activity'], queryFn: () => pkiGet<{ sessions: ActItem[] }>('/api/me/eid/activity'), enabled: show });

  if (!show) return null;

  const forbidden = summary.data?.status === 403;
  const s = summary.data?.data ?? null;

  const statusTone = (st: string) => (st === 'VALID' ? 'success' : st === 'REVOKED' ? 'danger' : 'warning');

  return (
    <section className="card" aria-label={T('me.pki.title')}>
      <div className="card__head card__head--with-sub">
        <div className="card__title"><h2>{T('me.pki.title')}</h2></div>
        <span className="card__sub">{T('me.pki.sub')} <span className="mono">eidmongolia.mn/v3</span></span>
      </div>

      {forbidden ? (
        <p className="muted" style={{ padding: '4px 2px' }}>{T('me.pki.pending')}</p>
      ) : (
        <>
          {/* Нэгдсэн тоо — tiles */}
          <div className="pki-tiles">
            <Tile icon={<KeyRound size={18} />} label={T('me.pki.certsValid')} value={s ? `${s.certificates.valid}/${s.certificates.total}` : '—'} tone="success" />
            <Tile icon={<LogIn size={18} />} label={T('me.pki.auth')} value={s?.activity.authentication ?? '—'} />
            <Tile icon={<FileSignature size={18} />} label={T('me.pki.sign')} value={s?.activity.signature ?? '—'} />
            <Tile icon={<Smartphone size={18} />} label={T('me.pki.devices')} value={s ? `${s.devices_active}/${s.devices_total}` : '—'} />
            <Tile icon={<Building2 size={18} />} label={T('me.pki.orgsCount')} value={s?.representation_count ?? '—'} />
          </div>

          {/* Гэрчилгээний жагсаалт */}
          {(certs.data?.data?.certificates?.length ?? 0) > 0 && (
            <div className="pki-list">
              <h3 className="pki-list__title">{T('me.pki.certList')}</h3>
              {certs.data!.data!.certificates.map((c) => (
                <div key={c.document_number + c.serial_number} className="pki-row">
                  <ShieldCheck size={15} />
                  <span className="pki-row__main">{c.type} · <span className="mono">{c.serial_number}</span></span>
                  <span className="chip chip--neutral">{c.certificate_level}</span>
                  <span className={`badge badge--${statusTone(c.status)}`}>{c.status}</span>
                  {c.not_after && <span className="pki-row__meta mono">{formatTS(c.not_after)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Холбоотой төхөөрөмж */}
          {(devices.data?.data?.devices?.length ?? 0) > 0 && (
            <div className="pki-list">
              <h3 className="pki-list__title">{T('me.pki.devList')}</h3>
              {devices.data!.data!.devices.map((d) => (
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

          {/* Activity */}
          {(activity.data?.data?.sessions?.length ?? 0) > 0 && (
            <div className="pki-list">
              <h3 className="pki-list__title">{T('me.pki.actList')}</h3>
              {activity.data!.data!.sessions.map((a, i) => (
                <div key={i} className="pki-row">
                  {a.flow === 'SIGNATURE' ? <FileSignature size={15} /> : <LogIn size={15} />}
                  <span className="pki-row__main">{lang === 'en' ? a.flow : (a.flow === 'SIGNATURE' ? 'Гарын үсэг' : 'Нэвтрэлт')}</span>
                  <span className={`badge badge--${a.outcome === 'OK' ? 'success' : 'warning'}`}>{a.outcome}</span>
                  {a.timestamp && <span className="pki-row__meta mono">{formatTS(a.timestamp)}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
