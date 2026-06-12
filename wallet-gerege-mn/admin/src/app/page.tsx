import React from 'react';
import Shell from '@/components/Shell';
import { adminFetch } from '@/lib/api';
import { TurnoverBars, StatusDonut, type Bar } from '@/components/Charts';
import { IcoClients, IcoAccounts, IcoCheck, IcoCoin, IcoShield, IcoWarn, IcoReports, IcoFees } from '@/components/icons';

export const dynamic = 'force-dynamic';

interface Client { active: boolean }
interface Account { status: string; balance_minor: number }
interface Recon { ok: boolean; discrepancies: unknown[] }
interface Turn { day: string; credit_minor: number; debit_minor: number }
interface TB { gl_account: string; gl_type: string; gl_name: string; balance_minor: number }

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

const GL_TYPE: Record<string, { label: string; cls: string }> = {
  ASSET: { label: 'Хөрөнгө', cls: 'badge--info' },
  LIABILITY: { label: 'Өр төлбөр', cls: 'badge--ok' },
  EQUITY: { label: 'Өмч', cls: 'badge--off' },
  INCOME: { label: 'Орлого', cls: 'badge--ok' },
  EXPENSE: { label: 'Зарлага', cls: 'badge--frozen' },
};

export default async function OverviewPage() {
  const today = new Date();
  const from = dayStr(new Date(today.getTime() - 13 * 86400000));
  const to = dayStr(today);

  const [clients, accounts, recon, turnover, trial] = await Promise.all([
    adminFetch<{ clients: Client[] }>('/admin/clients'),
    adminFetch<{ accounts: Account[] }>('/admin/accounts?limit=200'),
    adminFetch<Recon>('/admin/reconcile', { method: 'POST' }),
    adminFetch<{ rows: Turn[] }>(`/admin/reports/turnover?from=${from}&to=${to}`),
    adminFetch<{ rows: TB[] }>('/admin/reports/trial-balance'),
  ]);

  const gl = (trial.ok ? trial.data?.rows ?? [] : []).slice().sort((a, b) => Math.abs(b.balance_minor) - Math.abs(a.balance_minor));
  const customerFloat = gl.find((g) => g.gl_account === 'customer_wallet_liability')?.balance_minor ?? 0;

  const cl = clients.ok ? clients.data?.clients ?? [] : [];
  const ac = accounts.ok ? accounts.data?.accounts ?? [] : [];
  const totalBalance = ac.reduce((s, a) => s + (a.balance_minor || 0), 0);
  const reconOk = recon.ok && recon.data?.ok;
  const mnt = (n: number) => `${new Intl.NumberFormat('mn-MN').format(n)}₮`;

  // 14 хоногийн цонхыг (хоосон өдрийг 0-оор) дүүргэнэ.
  const tmap = new Map<string, Turn>();
  (turnover.ok ? turnover.data?.rows ?? [] : []).forEach((r) => tmap.set(r.day.slice(0, 10), r));
  const bars: Bar[] = Array.from({ length: 14 }, (_, i) => {
    const d = dayStr(new Date(today.getTime() - (13 - i) * 86400000));
    const r = tmap.get(d);
    return { label: d, credit: r?.credit_minor ?? 0, debit: r?.debit_minor ?? 0 };
  });
  const hasTurnover = bars.some((b) => b.credit || b.debit);

  // Дансны төлвийн хуваарилалт.
  const by = (s: string) => ac.filter((a) => a.status === s).length;
  const segs = [
    { label: 'Идэвхтэй', value: by('active'), color: '#10b981' },
    { label: 'Царцсан', value: by('frozen'), color: '#f59e0b' },
    { label: 'Хаасан', value: by('closed'), color: '#5b6379' },
    { label: 'Хүлээгдэж буй', value: by('pending'), color: '#38bdf8' },
  ].filter((s) => s.value > 0);

  return (
    <Shell title="Тойм" sub="Wallet ledger-ийн ерөнхий байдал">
      <div className="grid">
        <div className="stat">
          <div className="stat__icon"><IcoClients /></div>
          <div className="stat__n tnum">{cl.length}</div>
          <div className="stat__l">Client ({cl.filter((c) => c.active).length} идэвхтэй)</div>
        </div>
        <div className="stat stat--sky">
          <div className="stat__icon"><IcoAccounts /></div>
          <div className="stat__n tnum">{ac.length}</div>
          <div className="stat__l">Данс (харсан 200)</div>
        </div>
        <div className="stat stat--green">
          <div className="stat__icon"><IcoCheck /></div>
          <div className="stat__n tnum">{by('active')}</div>
          <div className="stat__l">Идэвхтэй данс</div>
        </div>
        <div className="stat stat--amber">
          <div className="stat__icon"><IcoCoin /></div>
          <div className="stat__n tnum mono">{mnt(totalBalance)}</div>
          <div className="stat__l">Нийт үлдэгдэл</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card" style={{ margin: 0 }}>
          <h3 className="card__title"><IcoReports /> Өдрийн эргэлт (14 хоног)</h3>
          {hasTurnover ? (
            <>
              <TurnoverBars data={bars} />
              <div className="legend" style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
                <span className="legend__row" style={{ flex: 'none' }}><span className="legend__dot" style={{ background: '#10b981' }} /> Орлого</span>
                <span className="legend__row" style={{ flex: 'none' }}><span className="legend__dot" style={{ background: '#f43f5e' }} /> Зарлага</span>
              </div>
            </>
          ) : (
            <div className="empty"><IcoReports /><p>Сүүлийн 14 хоногт эргэлт алга.<br />Гүйлгээ хийгдсэний дараа энд харагдана.</p></div>
          )}
        </div>

        <div className="card" style={{ margin: 0 }}>
          <h3 className="card__title"><IcoAccounts /> Дансны төлөв</h3>
          {segs.length ? (
            <StatusDonut segments={segs} centerSub="данс" />
          ) : (
            <div className="empty"><IcoAccounts /><p>Данс алга.</p></div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card__title"><IcoFees /> Ерөнхий данс (GL) — нийт мөнгөн урсгал</h3>
        <div className="grid" style={{ marginBottom: 16 }}>
          <div className="stat stat--green">
            <div className="stat__icon"><IcoCoin /></div>
            <div className="stat__n tnum mono">{mnt(customerFloat)}</div>
            <div className="stat__l">Систем дэх нийт мөнгө (хэрэглэгчийн өр)</div>
          </div>
        </div>
        {gl.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>GL данс</th><th>Төрөл</th><th>Нэр</th><th style={{ textAlign: 'right' }}>Үлдэгдэл</th></tr></thead>
              <tbody>
                {gl.map((g) => {
                  const t = GL_TYPE[g.gl_type] ?? { label: g.gl_type, cls: 'badge--off' };
                  return (
                    <tr key={g.gl_account}>
                      <td className="mono">{g.gl_account}</td>
                      <td><span className={`badge ${t.cls}`}>{t.label}</span></td>
                      <td>{g.gl_name}</td>
                      <td className="mono tnum" style={{ textAlign: 'right' }}>{mnt(g.balance_minor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><IcoFees /><p>GL дансны мэдээлэл алга.</p></div>
        )}
        <p className="muted" style={{ fontSize: 12.5, margin: '8px 2px 0' }}>
          Орлого (fee_income) · Зарлага (bank_charge_expense) · Түр данс (suspense_liability) зэрэг
          double-entry GL дансууд. Гүйлгээ бүр эдгээрт дебит/кредитээр бичигдэнэ. Дэлгэрэнгүйг Тайлан → Trial balance-аас.
        </p>
      </div>

      <div className="card">
        <h3 className="card__title"><IcoShield /> Ledger бүрэн бүтэн байдал</h3>
        {recon.ok ? (
          reconOk ? (
            <div className="alert alert--ok"><IcoCheck /> Reconcile — зөрүү алга, ledger тэнцсэн.</div>
          ) : (
            <div className="alert alert--err"><IcoWarn /> {recon.data?.discrepancies?.length} зөрүү илрэв — нягтлана уу.</div>
          )
        ) : (
          <div className="alert alert--err"><IcoWarn /> Reconcile ажиллуулж чадсангүй: {recon.message}</div>
        )}
        <p className="muted" style={{ fontSize: 12.5, margin: '4px 2px 0' }}>
          Double-entry ledger-ийн дебит/кредит тэнцэл, дансны үлдэгдлийг шалгана. Worker мөн цаг тутам автоматаар reconcile хийдэг.
        </p>
      </div>
    </Shell>
  );
}
