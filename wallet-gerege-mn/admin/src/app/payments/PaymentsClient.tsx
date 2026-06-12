"use client";

import React, { useMemo, useState } from 'react';
import { IcoSearch, IcoInbox, IcoCheck, IcoCoin, IcoReports } from '@/components/icons';
import { StatusDonut } from '@/components/Charts';

export interface PaymentRow {
  id: string;
  kind: string;
  payee_account_no: string;
  amount_minor?: number;
  currency: string;
  reference: string;
  status: string;
  expires_at?: string;
  paid_by?: string;
  paid_at?: string;
  paid_amount_minor?: number;
  created_at: string;
}

const mnt = (n?: number) => (n != null ? `${new Intl.NumberFormat('mn-MN').format(n)}₮` : '—');
const STATUSES = ['', 'active', 'pending', 'paid', 'expired', 'canceled'];
const stLabel: Record<string, string> = { '': 'Бүх төлөв', active: 'Идэвхтэй', pending: 'Хүлээгдэж буй', paid: 'Төлөгдсөн', expired: 'Хугацаа дууссан', canceled: 'Цуцалсан' };
const stCls = (s: string) => (s === 'paid' ? 'badge--ok' : s === 'pending' || s === 'active' ? 'badge--info' : s === 'expired' ? 'badge--frozen' : 'badge--off');

export default function PaymentsClient({ rows }: { rows: PaymentRow[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');

  const stats = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    const paid = rows.filter((r) => r.status === 'paid');
    const volume = paid.reduce((s, r) => s + (r.paid_amount_minor || 0), 0);
    const segs = [
      { label: 'Төлөгдсөн', value: by('paid'), color: '#10b981' },
      { label: 'Хүлээгдэж буй', value: by('pending'), color: '#38bdf8' },
      { label: 'Идэвхтэй (static)', value: by('active'), color: '#6366f1' },
      { label: 'Хугацаа дууссан', value: by('expired'), color: '#f59e0b' },
      { label: 'Цуцалсан', value: by('canceled'), color: '#5b6379' },
    ].filter((s) => s.value > 0);
    return { paidCount: paid.length, volume, pending: by('pending'), segs };
  }, [rows]);
  const mntFull = (n: number) => `${new Intl.NumberFormat('mn-MN').format(n)}₮`;

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (kind && r.kind !== kind) return false;
      if (n && !(`${r.payee_account_no} ${r.reference} ${r.paid_by ?? ''} ${r.id}`.toLowerCase().includes(n))) return false;
      return true;
    });
  }, [rows, q, status, kind]);

  return (
    <>
      <div className="grid">
        <div className="stat stat--green"><div className="stat__icon"><IcoCheck /></div><div className="stat__n tnum">{stats.paidCount}</div><div className="stat__l">Төлөгдсөн</div></div>
        <div className="stat stat--amber"><div className="stat__icon"><IcoCoin /></div><div className="stat__n tnum mono">{mntFull(stats.volume)}</div><div className="stat__l">Нийт төлөгдсөн дүн</div></div>
        <div className="stat stat--sky"><div className="stat__icon"><IcoReports /></div><div className="stat__n tnum">{stats.pending}</div><div className="stat__l">Хүлээгдэж буй</div></div>
        <div className="stat"><div className="stat__icon"><IcoReports /></div><div className="stat__n tnum">{rows.length}</div><div className="stat__l">Нийт хүсэлт</div></div>
      </div>
      {stats.segs.length > 0 && (
        <div className="card">
          <h3 className="card__title"><IcoReports /> Төлбөрийн төлвийн хуваарилалт</h3>
          <StatusDonut segments={stats.segs} centerSub="хүсэлт" />
        </div>
      )}
    <div className="card">
      <div className="toolbar">
        <div className="search grow">
          <IcoSearch />
          <input className="input" placeholder="Данс, reference, төлөгчөөр хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Бүх төрөл</option>
          <option value="static">Static QR</option>
          <option value="dynamic">Dynamic invoice</option>
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{stLabel[s]}</option>)}
        </select>
        <span className="count-pill">{filtered.length} / {rows.length}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Огноо</th><th>Төрөл</th><th>Хүлээн авагч данс</th><th style={{ textAlign: 'right' }}>Дүн</th><th>Төлөв</th><th>Reference</th><th>Төлөгч</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ color: 'var(--muted)' }}>{r.created_at.replace('T', ' ').slice(0, 19)}</td>
                <td><span className={`badge ${r.kind === 'static' ? 'badge--off' : 'badge--info'}`}>{r.kind === 'static' ? 'static' : 'invoice'}</span></td>
                <td className="mono">{r.payee_account_no}</td>
                <td className="mono tnum" style={{ textAlign: 'right' }}>{r.status === 'paid' ? mnt(r.paid_amount_minor) : mnt(r.amount_minor)}</td>
                <td><span className={`badge ${stCls(r.status)}`}>{r.status}</span></td>
                <td style={{ color: 'var(--muted)' }}>{r.reference || '—'}</td>
                <td className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>{r.paid_by ? (r.paid_by.length > 16 ? `${r.paid_by.slice(0, 12)}…` : r.paid_by) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty"><IcoInbox /><p>{rows.length ? 'Шүүлтэнд тохирох төлбөр алга.' : 'Төлбөрийн хүсэлт алга.'}</p></div>
        )}
      </div>
    </div>
    </>
  );
}
