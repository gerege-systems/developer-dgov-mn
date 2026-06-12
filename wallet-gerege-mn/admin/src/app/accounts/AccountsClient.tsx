"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IcoSearch, IcoInbox, IcoClients } from '@/components/icons';
import { useConfirm } from '@/components/Confirm';

export interface Account {
  account_no: string;
  owner_type: string;
  owner_id: string;
  status: string;
  balance_minor: number;
  hold_minor: number;
  owner_name?: string;
  owner_national_id?: string;
  owner_kyc?: boolean;
}

const mnt = (n: number) => `${new Intl.NumberFormat('mn-MN').format(n)}₮`;
const maskNID = (s: string) => (s.length > 4 ? '•'.repeat(s.length - 4) + s.slice(-4) : s);
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const STATUSES = ['', 'active', 'frozen', 'closed', 'pending'];
const stLabel: Record<string, string> = { '': 'Бүх төлөв', active: 'Идэвхтэй', frozen: 'Царцсан', closed: 'Хаасан', pending: 'Хүлээгдэж буй' };
const SOURCES = ['', 'me', 'partner'];
const srcFilterLabel: Record<string, string> = { '': 'Бүх эх сурвалж', me: 'Иргэн (me)', partner: 'Партнёр' };

// owner_id-аас эх сурвалжийг (платформ) тодорхойлно.
function resolveSource(ownerId: string, clientMap: Record<string, string>) {
  if (clientMap[ownerId]) return { kind: 'partner', name: clientMap[ownerId], plat: 'Партнёр', cls: 'badge--info' };
  if (isUuid(ownerId)) return { kind: 'me', name: 'Иргэн', plat: 'me.gerege.mn', cls: 'badge--ok' };
  return { kind: 'other', name: ownerId, plat: '—', cls: 'badge--off' };
}

export default function AccountsClient({
  accounts, page, hasNext, clientMap,
}: { accounts: Account[]; page: number; hasNext: boolean; clientMap: Record<string, string> }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [src, setSrc] = useState('');

  const rows = useMemo(() => accounts.map((a) => ({ a, s: resolveSource(a.owner_id, clientMap) })), [accounts, clientMap]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(({ a, s }) => {
      if (status && a.status !== status) return false;
      if (src && s.kind !== src) return false;
      if (needle && !(`${a.account_no} ${a.owner_id} ${s.name} ${a.owner_name ?? ''} ${a.owner_national_id ?? ''}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, status, src]);

  const setAccStatus = async (no: string, s: string) => {
    const freeze = s === 'frozen';
    const ok = await confirm({
      title: freeze ? 'Данс царцаах' : 'Данс сэргээх',
      message: <>Данс <span className="mono">{no}</span>-г {freeze ? 'царцаах' : 'дахин идэвхжүүлэх'} үү?{freeze ? ' Царцсан данснаас гүйлгээ хийх боломжгүй болно.' : ''}</>,
      confirmText: freeze ? 'Царцаах' : 'Сэргээх',
      variant: freeze ? 'danger' : 'primary',
    });
    if (!ok) return;
    await fetch(`/api/accounts/${encodeURIComponent(no)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s }),
    });
    router.refresh();
  };

  return (
    <div className="card">
      {dialog}
      <div className="toolbar">
        <div className="search grow">
          <IcoSearch />
          <input className="input" placeholder="Данс, эзэн, эх сурвалжаар хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={src} onChange={(e) => setSrc(e.target.value)}>
          {SOURCES.map((s) => <option key={s} value={s}>{srcFilterLabel[s]}</option>)}
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{stLabel[s]}</option>)}
        </select>
        <span className="count-pill">{filtered.length} / {accounts.length}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Данс</th><th>Эзэн</th><th>Эх сурвалж / KYC</th><th>Төлөв</th><th style={{ textAlign: 'right' }}>Үлдэгдэл</th><th style={{ textAlign: 'right' }}>Барьцаа</th><th></th></tr></thead>
          <tbody>
            {filtered.map(({ a, s }) => (
              <tr key={a.account_no}>
                <td className="mono"><Link href={`/accounts/${a.account_no}`} style={{ fontWeight: 600 }}>{a.account_no}</Link></td>
                <td>
                  <div className="src">
                    <span className="src__name">
                      {s.kind === 'me' && <IcoClients style={{ width: 14, height: 14, verticalAlign: '-2px', marginRight: 5 }} />}
                      {a.owner_name || s.name}
                    </span>
                    {a.owner_national_id
                      ? <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }} title={`Регистр: ${a.owner_national_id}`}>РД {maskNID(a.owner_national_id)}</span>
                      : <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }} title={a.owner_id}>{a.owner_id.length > 18 ? `${a.owner_id.slice(0, 8)}…` : a.owner_id}</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${s.cls}`}>{s.plat}</span>
                    {a.owner_kyc && <span className="badge badge--ok" title="eID-ээр баталгаажсан">KYC ✓</span>}
                  </div>
                </td>
                <td><span className={`badge ${a.status === 'active' ? 'badge--ok' : a.status === 'frozen' ? 'badge--frozen' : 'badge--off'}`}>{a.status}</span></td>
                <td className="mono" style={{ textAlign: 'right' }}>{mnt(a.balance_minor)}</td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>{mnt(a.hold_minor)}</td>
                <td style={{ textAlign: 'right' }}>
                  {a.status === 'active'
                    ? <button className="btn btn--red btn--sm" onClick={() => setAccStatus(a.account_no, 'frozen')}>Царцаах</button>
                    : a.status === 'frozen'
                      ? <button className="btn btn--green btn--sm" onClick={() => setAccStatus(a.account_no, 'active')}>Сэргээх</button>
                      : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty"><IcoInbox /><p>{accounts.length ? 'Шүүлтэнд тохирох данс алга.' : 'Данс алга.'}</p></div>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
        {page > 0 ? <Link className="btn btn--ghost" href={`/accounts?page=${page - 1}`}>← Өмнөх</Link> : <span />}
        {hasNext ? <Link className="btn btn--ghost" href={`/accounts?page=${page + 1}`}>Дараах →</Link> : <span />}
      </div>
    </div>
  );
}
