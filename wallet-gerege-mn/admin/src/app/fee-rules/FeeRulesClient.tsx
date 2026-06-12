"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/Confirm';

export interface FeeRule {
  code: string;
  txn_type: string;
  method: string;
  flat_minor: number;
  percent_bps: number;
  min_minor?: number;
  max_minor?: number;
  gl_account: string;
  priority: number;
  active: boolean;
}

const mnt = (n: number) => new Intl.NumberFormat('mn-MN').format(n);

function describe(r: FeeRule): string {
  if (r.method === 'FLAT') return `${mnt(r.flat_minor)}₮`;
  if (r.method === 'PERCENT') {
    const pct = (r.percent_bps / 100).toFixed(2).replace(/\.?0+$/, '');
    let s = `${pct}%`;
    if (r.min_minor != null) s += ` (min ${mnt(r.min_minor)}₮)`;
    if (r.max_minor != null) s += ` (max ${mnt(r.max_minor)}₮)`;
    return s;
  }
  return r.method;
}

export default function FeeRulesClient({ rules }: { rules: FeeRule[] }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const toggle = async (code: string, active: boolean) => {
    const ok = await confirm({
      title: active ? 'Шимтгэл идэвхжүүлэх' : 'Шимтгэл унтраах',
      message: <><span className="mono">{code}</span> дүрмийг {active ? 'идэвхжүүлэх' : 'унтраах'} уу?{active ? ' Идэвхжүүлснээр гүйлгээнд шимтгэл ногдож эхэлнэ.' : ''}</>,
      confirmText: active ? 'Идэвхжүүлэх' : 'Унтраах',
      variant: active ? 'primary' : 'danger',
    });
    if (!ok) return;
    await fetch(`/api/fee-rules/${encodeURIComponent(code)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    router.refresh();
  };
  return (
    <div className="card">
      {dialog}
      <table>
        <thead><tr><th>Код</th><th>Гүйлгээ</th><th>Шимтгэл</th><th>GL</th><th>Эрэмбэ</th><th>Төлөв</th><th></th></tr></thead>
        <tbody>
          {rules.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>Дүрэм алга.</td></tr>}
          {rules.map((r) => (
            <tr key={r.code}>
              <td className="mono">{r.code}</td>
              <td>{r.txn_type}</td>
              <td className="mono">{describe(r)}</td>
              <td className="mono" style={{ color: 'var(--muted)' }}>{r.gl_account}</td>
              <td className="mono" style={{ textAlign: 'center' }}>{r.priority}</td>
              <td><span className={`badge ${r.active ? 'badge--ok' : 'badge--off'}`}>{r.active ? 'идэвхтэй' : 'template'}</span></td>
              <td style={{ textAlign: 'right' }}>
                <button className={`btn ${r.active ? 'btn--red' : 'btn--green'}`} onClick={() => toggle(r.code, !r.active)}>
                  {r.active ? 'Унтраах' : 'Идэвхжүүлэх'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
