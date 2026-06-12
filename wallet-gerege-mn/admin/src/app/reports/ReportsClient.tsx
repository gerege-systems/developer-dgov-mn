"use client";

import React, { useState } from 'react';

type Tab = 'trial' | 'turnover' | 'statement';

const mnt = (n: number) => new Intl.NumberFormat('mn-MN').format(n);
const todayStr = '2026-06-04';

interface TrialRow { gl_account: string; gl_type: string; gl_name: string; debit_minor: number; credit_minor: number; balance_minor: number }
interface TurnoverRow { day: string; accounts: number; credit_minor: number; debit_minor: number; net_minor: number; closing_minor: number; txn_count: number }
interface StatementRow { txn_id: string; txn_at: string; type: string; amount_minor: number; running_balance_minor: number; external_ref?: string; is_reversed: boolean }

export default function ReportsClient() {
  const [tab, setTab] = useState<Tab>('trial');
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className={`btn ${tab === 'trial' ? '' : 'btn--ghost'}`} onClick={() => setTab('trial')}>Trial balance</button>
        <button className={`btn ${tab === 'turnover' ? '' : 'btn--ghost'}`} onClick={() => setTab('turnover')}>Эргэлт</button>
        <button className={`btn ${tab === 'statement' ? '' : 'btn--ghost'}`} onClick={() => setTab('statement')}>Дансны хуулга</button>
      </div>
      {tab === 'trial' && <TrialBalance />}
      {tab === 'turnover' && <Turnover />}
      {tab === 'statement' && <Statement />}
    </>
  );
}

function useReport<T>() {
  const [rows, setRows] = useState<T[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = async (url: string, key: string) => {
    setBusy(true); setErr('');
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok) { setRows((data?.[key] ?? data?.rows ?? []) as T[]); return; }
    setErr(data?.message ?? 'Тайлан ачаалахад алдаа гарлаа'); setRows([]);
  };
  return { rows, busy, err, load };
}

function TrialBalance() {
  const [date, setDate] = useState(todayStr);
  const { rows, busy, err, load } = useReport<TrialRow>();
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200 }} />
        <button className="btn" disabled={busy} onClick={() => load(`/api/reports/trial-balance?date=${date}`, 'rows')}>Ачаалах</button>
      </div>
      {err && <div className="alert alert--err">{err}</div>}
      <table>
        <thead><tr><th>GL</th><th>Төрөл</th><th>Нэр</th><th style={{ textAlign: 'right' }}>Дебит</th><th style={{ textAlign: 'right' }}>Кредит</th><th style={{ textAlign: 'right' }}>Үлдэгдэл</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.gl_account}>
              <td className="mono">{r.gl_account}</td><td>{r.gl_type}</td><td>{r.gl_name}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.debit_minor)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.credit_minor)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.balance_minor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Turnover() {
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);
  const { rows, busy, err, load } = useReport<TurnoverRow>();
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 180 }} />
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 180 }} />
        <button className="btn" disabled={busy} onClick={() => load(`/api/reports/turnover?from=${from}&to=${to}`, 'rows')}>Ачаалах</button>
      </div>
      {err && <div className="alert alert--err">{err}</div>}
      <table>
        <thead><tr><th>Өдөр</th><th style={{ textAlign: 'right' }}>Данс</th><th style={{ textAlign: 'right' }}>Кредит</th><th style={{ textAlign: 'right' }}>Дебит</th><th style={{ textAlign: 'right' }}>Цэвэр</th><th style={{ textAlign: 'right' }}>Хаалт</th><th style={{ textAlign: 'right' }}>Гүйлгээ</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <td className="mono">{r.day.slice(0, 10)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{r.accounts}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.credit_minor)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.debit_minor)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.net_minor)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.closing_minor)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{r.txn_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Statement() {
  const [acct, setAcct] = useState('');
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);
  const { rows, busy, err, load } = useReport<StatementRow>();
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input mono" placeholder="account_no" value={acct} onChange={(e) => setAcct(e.target.value)} style={{ maxWidth: 200 }} />
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 160 }} />
        <button className="btn" disabled={busy || !acct.trim()} onClick={() => load(`/api/reports/statement?account_no=${encodeURIComponent(acct.trim())}&from=${from}&to=${to}`, 'rows')}>Ачаалах</button>
      </div>
      {err && <div className="alert alert--err">{err}</div>}
      <table>
        <thead><tr><th>Цаг</th><th>Төрөл</th><th style={{ textAlign: 'right' }}>Дүн</th><th style={{ textAlign: 'right' }}>Үлдэгдэл</th><th>Ref</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.txn_id} style={r.is_reversed ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
              <td className="mono" style={{ color: 'var(--muted)' }}>{r.txn_at.replace('T', ' ').slice(0, 19)}</td>
              <td>{r.type}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.amount_minor)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{mnt(r.running_balance_minor)}</td>
              <td className="mono" style={{ color: 'var(--muted)' }}>{r.external_ref || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
