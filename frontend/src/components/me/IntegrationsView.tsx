"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HardDrive, Box, Video, CheckCircle2, AlertCircle, Clock, Plus, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { postJSON } from '@/lib/client';
import type { IntegrationStatus, IntegrationID } from '@/lib/integrations';
import DriveFiles from './DriveFiles';
import DropboxFiles from './DropboxFiles';
import MeetSpace from './MeetSpace';

const ICONS: Record<IntegrationID, LucideIcon> = {
  'google-drive': HardDrive,
  dropbox: Box,
  'google-meet': Video,
};

// Карт дээрх жижиг ангилал (брэндийн доорх 2 дахь мөр).
const CATEGORIES: Record<IntegrationID, string> = {
  'google-drive': 'Файл хадгалалт',
  dropbox: 'Файл хадгалалт',
  'google-meet': 'Видео уулзалт',
};

const DESCRIPTIONS: Record<IntegrationID, string> = {
  'google-drive': 'Баримтаа Google Drive-д хадгалж, eID-ээр баталгаажуулсан файлаа холбоно.',
  dropbox: 'Dropbox дахь файлдаа хандаж, гарын үсэгт баримтыг синк хийнэ.',
  'google-meet': 'eID хуралд Google Meet-ийн видео уулзалтыг шууд үүсгэнэ.',
};

export default function EidIntegrationsView({ items }: { items: IntegrationStatus[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const connectedParam = params.get('connected');
  const error = params.get('error');
  const errorProvider = params.get('provider');
  const [pending, setPending] = React.useState<IntegrationID | null>(null);
  const [actionErr, setActionErr] = React.useState('');

  async function disconnect(id: IntegrationID) {
    if (!window.confirm('Энэ холболтыг салгах уу?')) return;
    setPending(id);
    setActionErr('');
    const res = await postJSON(`/api/integrations/${id}/disconnect`, {});
    setPending(null);
    if (res.ok) router.refresh();
    else setActionErr(res.message || 'Салгахад алдаа гарлаа. Дахин оролдоно уу.');
  }

  const errorText = (e: string) =>
    e === 'not_configured' ? 'Энэ үйлчилгээ хараахан тохируулагдаагүй байна.'
      : e === 'denied' ? 'Та зөвшөөрлийг цуцалсан байна.'
      : e === 'invalid_state' ? 'Аюулгүй байдлын шалгалт амжилтгүй. Дахин оролдоно уу.'
      : e === 'exchange_failed' ? 'Токен солилцоо амжилтгүй. Дахин оролдоно уу.'
      : e === 'store_failed' ? 'Токен хадгалахад алдаа гарлаа. Дахин оролдоно уу.'
      : 'Тодорхойгүй алдаа гарлаа.';

  return (
    <>
      {connectedParam && (
        <div className="alert" role="status" style={{ borderLeft: '3px solid var(--success, #16a34a)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} style={{ color: 'var(--success, #16a34a)' }} />
          <span translate="no">{connectedParam}</span>&nbsp;амжилттай холбогдлоо.
        </div>
      )}
      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          {errorText(error)}{errorProvider ? ` (${errorProvider})` : ''}
        </div>
      )}
      {actionErr && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {actionErr}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {items.map((it) => {
          const Icon = ICONS[it.id];
          const busy = pending === it.id;
          return (
            <div
              key={it.id}
              className="card int-card"
              style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, margin: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span
                  aria-hidden
                  style={{
                    flex: '0 0 auto', width: 40, height: 40, borderRadius: 10,
                    background: 'var(--surface-2, #f3f4f6)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--fg)',
                  }}
                >
                  <Icon size={20} strokeWidth={2} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div translate="no" style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg)' }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{CATEGORIES[it.id]}</div>
                </div>

                <ActionButton
                  status={it}
                  busy={busy}
                  onDisconnect={() => disconnect(it.id)}
                />
              </div>

              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                {DESCRIPTIONS[it.id]}
              </p>

              {it.connected && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success, #16a34a)', fontWeight: 600 }}>
                  <CheckCircle2 size={13} /> Холбогдсон
                </span>
              )}
              {!it.configured && !it.connected && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
                  <Clock size={13} /> Удахгүй
                </span>
              )}

              {/* Google Drive холбогдсон үед — card дотор "Файл нээх" товч,
                  бүх үйлдэл popup (Dialog) дотор. */}
              {it.id === 'google-drive' && it.connected && <DriveFiles />}

              {/* Dropbox холбогдсон үед — "Файл нээх" popup (/Gerege хавтас). */}
              {it.id === 'dropbox' && it.connected && <DropboxFiles />}

              {/* Google Meet холбогдсон үед — "Уулзалт үүсгэх" товч; шинэ видео
                  уулзалт үүсгээд линкийг тэндээ харуулна. */}
              {it.id === 'google-meet' && it.connected && <MeetSpace />}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Баруун дээд буланд дугуй үйлдлийн товч: холбох (+) / холбогдсон (✓, дарвал
// салгана) / тохируулаагүй (⏷ идэвхгүй).
function ActionButton({
  status, busy, onDisconnect,
}: { status: IntegrationStatus; busy: boolean; onDisconnect: () => void }) {
  const base: React.CSSProperties = {
    flex: '0 0 auto', width: 32, height: 32, borderRadius: 8,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border, #e5e7eb)', background: 'var(--card, #fff)',
    cursor: 'pointer', textDecoration: 'none', color: 'var(--fg)',
  };

  if (status.connected) {
    return (
      <button
        type="button"
        onClick={onDisconnect}
        disabled={busy}
        title="Салгах"
        aria-label="Салгах"
        className="int-card__action int-card__action--connected"
        style={{
          ...base,
          borderColor: 'var(--success, #16a34a)',
          color: 'var(--success, #16a34a)',
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? <Clock size={16} /> : <Check size={16} strokeWidth={2.5} />}
      </button>
    );
  }

  if (status.configured) {
    return (
      <a
        href={`/api/integrations/${status.id}/connect`}
        title="Холбох"
        aria-label="Холбох"
        className="int-card__action"
        style={{ ...base, borderColor: 'var(--dan-blue-text, #2563eb)', color: 'var(--dan-blue-text, #2563eb)' }}
      >
        <Plus size={18} strokeWidth={2.5} />
      </a>
    );
  }

  return (
    <span
      title="Удахгүй тохируулагдана"
      aria-label="Удахгүй"
      style={{ ...base, cursor: 'not-allowed', color: 'var(--muted)', opacity: 0.6 }}
    >
      <Plus size={18} strokeWidth={2} />
    </span>
  );
}
