import React from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { adminFetch } from '@/lib/api';
import AccountActions from './AccountActions';
import { IcoCoin, IcoAccounts, IcoClients, IcoReports, IcoInbox } from '@/components/icons';

export const dynamic = 'force-dynamic';

interface Account {
  account_no: string; owner_type: string; owner_id: string; currency: string;
  status: string; balance_minor: number; hold_minor: number; created_at: string; updated_at: string;
  owner_name?: string; owner_national_id?: string; owner_kyc?: boolean;
}
interface Profile {
  full_name?: string; given_name?: string; family_name?: string; national_id?: string;
  phone?: string; email?: string; kyc_verified?: boolean; source?: string; updated_at?: string;
}
interface Stmt {
  txn_id: string; txn_at: string; type: string; amount_minor: number;
  running_balance_minor: number; external_ref?: string; is_reversed: boolean;
}
interface Client { client_id: string; name: string }

const mnt = (n: number) => `${new Intl.NumberFormat('mn-MN').format(n)}₮`;
const dayStr = (d: Date) => d.toISOString().slice(0, 10);
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const TXN: Record<string, string> = {
  deposit: 'Орлого', withdrawal: 'Зарлага', transfer_in: 'Шилжүүлэг (орлого)', transfer_out: 'Шилжүүлэг (гарлага)',
  hold: 'Барьцаа', release: 'Барьцаа суллалт', fee: 'Шимтгэл', reversal: 'Буцаалт',
};
const stBadge = (s: string) => (s === 'active' ? 'badge--ok' : s === 'frozen' ? 'badge--frozen' : 'badge--off');

export default async function AccountDetailPage({
  params, searchParams,
}: { params: { account_no: string }; searchParams: Record<string, string | undefined> }) {
  const accountNo = params.account_no;
  const to = searchParams.to || dayStr(new Date());
  const from = searchParams.from || '2020-01-01';

  const [accRes, stmtRes, clRes] = await Promise.all([
    adminFetch<{ account: Account; profile: Profile | null }>(`/admin/accounts/${encodeURIComponent(accountNo)}`),
    adminFetch<{ rows: Stmt[] }>(`/admin/reports/statement?account_no=${encodeURIComponent(accountNo)}&from=${from}&to=${to}`),
    adminFetch<{ clients: Client[] }>('/admin/clients'),
  ]);

  if (!accRes.ok || !accRes.data?.account) {
    return (
      <Shell title="Данс олдсонгүй" sub={accountNo}>
        <div className="card"><div className="empty"><IcoInbox /><p>Ийм данс олдсонгүй.</p></div></div>
        <Link className="btn btn--ghost" href="/accounts">← Дансууд руу буцах</Link>
      </Shell>
    );
  }

  const a = accRes.data.account;
  const profile = accRes.data.profile;
  const rows = stmtRes.ok ? stmtRes.data?.rows ?? [] : [];
  const clientMap: Record<string, string> = {};
  (clRes.ok ? clRes.data?.clients ?? [] : []).forEach((c) => { clientMap[c.client_id] = c.name || c.client_id; });

  const available = a.balance_minor - a.hold_minor;
  const partner = clientMap[a.owner_id];
  const source = partner
    ? { name: partner, plat: 'Партнёр', cls: 'badge--info' }
    : isUuid(a.owner_id) || profile
      ? { name: a.owner_name || profile?.full_name || 'Иргэн', plat: 'me.gerege.mn', cls: 'badge--ok' }
      : { name: a.owner_id, plat: '—', cls: 'badge--off' };
  const nid = profile?.national_id || a.owner_national_id;
  const kyc = profile?.kyc_verified ?? a.owner_kyc;

  return (
    <Shell
      title={accountNo}
      sub={`${source.name} · ${a.currency}`}
      actions={<><Link className="btn btn--ghost" href="/accounts">← Буцах</Link><AccountActions accountNo={accountNo} status={a.status} /></>}
    >
      <div className="grid">
        <div className="stat stat--green"><div className="stat__icon"><IcoCoin /></div><div className="stat__n tnum mono">{mnt(a.balance_minor)}</div><div className="stat__l">Үлдэгдэл</div></div>
        <div className="stat stat--amber"><div className="stat__icon"><IcoCoin /></div><div className="stat__n tnum mono">{mnt(a.hold_minor)}</div><div className="stat__l">Барьцаа</div></div>
        <div className="stat stat--sky"><div className="stat__icon"><IcoCoin /></div><div className="stat__n tnum mono">{mnt(available)}</div><div className="stat__l">Боломжит</div></div>
        <div className="stat"><div className="stat__icon"><IcoAccounts /></div><div className="stat__n"><span className={`badge ${stBadge(a.status)}`} style={{ fontSize: 14 }}>{a.status}</span></div><div className="stat__l">Төлөв</div></div>
      </div>

      <div className="card">
        <h3 className="card__title"><IcoClients /> Хэрэглэгчийн мэдээлэл</h3>
        <div className="creds">
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>Нэр</span><span>{source.name}</span></div>
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>Регистр (РД)</span><span className="mono">{nid || '—'}</span></div>
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>Утас</span><span>{profile?.phone || '—'}</span></div>
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>Имэйл</span><span>{profile?.email || '—'}</span></div>
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>KYC</span><span>{kyc ? <span className="badge badge--ok">eID баталгаажсан</span> : <span className="badge badge--off">баталгаажаагүй</span>}</span></div>
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>Эх сурвалж</span><span className={`badge ${source.cls}`}>{source.plat}</span></div>
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>owner_type</span><span>{a.owner_type}</span></div>
          <div className="creds__row"><span className="creds__k" style={{ width: 130 }}>owner_id</span><span className="mono" style={{ fontSize: 12 }}>{a.owner_id}</span></div>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: '8px 2px 0' }}>
          Үүсгэсэн: {a.created_at?.replace('T', ' ').slice(0, 19)} · Шинэчилсэн: {a.updated_at?.replace('T', ' ').slice(0, 19)}
          {profile?.updated_at ? ` · Профайл: ${profile.updated_at.replace('T', ' ').slice(0, 19)}` : ''}
        </p>
      </div>

      <div className="card">
        <h3 className="card__title"><IcoReports /> Дансны хуулга</h3>
        <form method="GET" className="toolbar">
          <div className="field" style={{ margin: 0 }}>
            <label>Эхлэх</label>
            <input className="input" type="date" name="from" defaultValue={from === '2020-01-01' ? '' : from} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Дуусах</label>
            <input className="input" type="date" name="to" defaultValue={to} />
          </div>
          <button className="btn" type="submit">Шүүх</button>
          <span className="count-pill">{rows.length} гүйлгээ</span>
        </form>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Цаг</th><th>Төрөл</th><th style={{ textAlign: 'right' }}>Дүн</th><th style={{ textAlign: 'right' }}>Үлдэгдэл</th><th>Ref</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.txn_id} style={r.is_reversed ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{r.txn_at.replace('T', ' ').slice(0, 19)}</td>
                  <td>{TXN[r.type] || r.type}</td>
                  <td className="mono tnum" style={{ textAlign: 'right' }}>{mnt(r.amount_minor)}</td>
                  <td className="mono tnum" style={{ textAlign: 'right' }}>{mnt(r.running_balance_minor)}</td>
                  <td className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>{r.external_ref || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="empty"><IcoInbox /><p>Энэ хугацаанд гүйлгээ алга.</p></div>}
        </div>
      </div>
    </Shell>
  );
}
