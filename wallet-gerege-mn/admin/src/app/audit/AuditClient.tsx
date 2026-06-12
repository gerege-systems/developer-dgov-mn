"use client";

import React, { useMemo, useState } from 'react';
import { IcoSearch, IcoInbox } from '@/components/icons';

export interface AuditRow {
  actor_subject: string;
  action: string;
  method: string;
  path: string;
  status_code: number;
  ip: string;
  latency_ms: number;
  created_at: string;
}

function statusClass(code: number): string {
  if (code >= 500) return 'badge--off';
  if (code >= 400) return 'badge--frozen';
  return 'badge--ok';
}

export default function AuditClient({ rows }: { rows: AuditRow[] }) {
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('');
  const [klass, setKlass] = useState('');

  const methods = useMemo(() => Array.from(new Set(rows.map((r) => r.method))).sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((a) => {
      if (method && a.method !== method) return false;
      if (klass === 'ok' && a.status_code >= 400) return false;
      if (klass === 'err' && a.status_code < 400) return false;
      if (needle && !(`${a.path} ${a.actor_subject} ${a.action} ${a.ip}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, method, klass]);

  return (
    <div className="card">
      <div className="toolbar">
        <div className="search grow">
          <IcoSearch />
          <input className="input" placeholder="Зам, subject, IP-гаар хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">Бүх method</option>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="seg">
          <button className={klass === '' ? 'on' : ''} onClick={() => setKlass('')}>Бүгд</button>
          <button className={klass === 'ok' ? 'on' : ''} onClick={() => setKlass('ok')}>2xx/3xx</button>
          <button className={klass === 'err' ? 'on' : ''} onClick={() => setKlass('err')}>4xx/5xx</button>
        </div>
        <span className="count-pill">{filtered.length} / {rows.length}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Цаг</th><th>Subject</th><th>Үйлдэл</th><th>Method</th><th>Зам</th><th>Статус</th><th>IP</th><th style={{ textAlign: 'right' }}>ms</th></tr></thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td className="mono" style={{ color: 'var(--muted)' }}>{a.created_at.replace('T', ' ').slice(0, 19)}</td>
                <td className="mono">{a.actor_subject || '—'}</td>
                <td>{a.action || '—'}</td>
                <td className="mono">{a.method}</td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{a.path}</td>
                <td><span className={`badge ${statusClass(a.status_code)}`}>{a.status_code}</span></td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{a.ip}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{a.latency_ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty"><IcoInbox /><p>{rows.length ? 'Шүүлтэнд тохирох бичлэг алга.' : 'Бичлэг алга.'}</p></div>
        )}
      </div>
    </div>
  );
}
