"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IcoSearch, IcoInbox, IcoReports, IcoCheck, IcoShield } from '@/components/icons';
import { useConfirm } from '@/components/Confirm';
import { buildCredsHTML, openPdf } from '@/lib/clientdoc';
import { BP } from '@/lib/basepath';

export interface Client {
  client_id: string;
  name: string;
  active: boolean;
  allowed_ips?: string;
  webhook_url?: string;
  created_at: string;
  last_used_at?: string;
}

interface Created { client_id: string; client_secret: string; name: string }

const nowStr = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export default function ClientsClient({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<Created | null>(null);
  const [q, setQ] = useState('');
  const [filt, setFilt] = useState<'all' | 'active' | 'inactive'>('all');
  const [ipEdit, setIpEdit] = useState<{ id: string; name: string; value: string } | null>(null);
  const [ipErr, setIpErr] = useState('');
  const [ipBusy, setIpBusy] = useState(false);
  const [whEdit, setWhEdit] = useState<{ id: string; name: string; value: string } | null>(null);
  const [whErr, setWhErr] = useState('');
  const [whBusy, setWhBusy] = useState(false);
  const [whSecret, setWhSecret] = useState('');

  const saveWebhook = async () => {
    if (!whEdit) return;
    setWhBusy(true); setWhErr(''); setWhSecret('');
    const res = await fetch(`${BP}/api/clients/${encodeURIComponent(whEdit.id)}/webhook`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: whEdit.value.trim() }),
    });
    const data = await res.json().catch(() => null);
    setWhBusy(false);
    if (res.ok) {
      if (data?.webhook_secret) { setWhSecret(data.webhook_secret); router.refresh(); return; }
      setWhEdit(null); router.refresh(); return;
    }
    setWhErr(data?.message ?? 'Webhook хадгалахад алдаа гарлаа');
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (filt === 'active' && !c.active) return false;
      if (filt === 'inactive' && c.active) return false;
      if (needle && !(`${c.client_id} ${c.name}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [clients, q, filt]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const nm = name.trim();
    const ok = await confirm({
      title: 'Шинэ client үүсгэх',
      message: <><span className="mono">{nm}</span> нэртэй client үүсгэх үү? client_id автоматаар үүснэ, client_secret зөвхөн НЭГ удаа харагдана.</>,
      confirmText: 'Үүсгэх',
    });
    if (!ok) return;
    setBusy(true); setErr(''); setCreated(null);
    const res = await fetch(`${BP}/api/clients`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nm }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok && data?.client_secret) {
      setCreated({ client_id: data.client_id, client_secret: data.client_secret, name: nm });
      setName('');
      router.refresh();
      return;
    }
    setErr(data?.message ?? 'Үүсгэхэд алдаа гарлаа');
  };

  const downloadCreds = () => {
    if (!created) return;
    openPdf(buildCredsHTML({ clientId: created.client_id, name: created.name, secret: created.client_secret, createdAt: nowStr() }));
  };
  const downloadDoc = (c: Client) => {
    openPdf(buildCredsHTML({ clientId: c.client_id, name: c.name, createdAt: c.created_at ? c.created_at.replace('T', ' ').slice(0, 19) : '' }));
  };

  const saveIPs = async () => {
    if (!ipEdit) return;
    const list = ipEdit.value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    setIpBusy(true); setIpErr('');
    const res = await fetch(`${BP}/api/clients/${encodeURIComponent(ipEdit.id)}/ips`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed_ips: list }),
    });
    const data = await res.json().catch(() => null);
    setIpBusy(false);
    if (res.ok) { setIpEdit(null); router.refresh(); return; }
    setIpErr(data?.message ?? 'IP хадгалахад алдаа гарлаа');
  };

  const toggle = async (clientID: string, active: boolean) => {
    const ok = await confirm({
      title: active ? 'Client идэвхжүүлэх' : 'Client идэвхгүй болгох',
      message: <><span className="mono">{clientID}</span>-г {active ? 'идэвхжүүлэх' : 'идэвхгүй болгох'} уу?{active ? '' : ' Идэвхгүй client токен авах боломжгүй болно.'}</>,
      confirmText: active ? 'Идэвхжүүлэх' : 'Идэвхгүй болгох',
      variant: active ? 'primary' : 'danger',
    });
    if (!ok) return;
    await fetch(`${BP}/api/clients/${encodeURIComponent(clientID)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    router.refresh();
  };

  return (
    <>
      {dialog}
      {ipEdit && (
        <div className="modal-overlay" onMouseDown={() => setIpEdit(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal__icon modal__icon--primary"><IcoShield /></div>
            <div className="modal__title">IP whitelist — {ipEdit.name}</div>
            <p className="modal__msg">Зөвшөөрсөн <b>IP / CIDR</b>-уудыг таслал эсвэл мөрөөр бичнэ. <b>Хоосон</b> бол бүх IP-аас токен авах боломжтой.</p>
            {ipErr && <div className="alert alert--err">{ipErr}</div>}
            <textarea
              className="input mono" rows={4} value={ipEdit.value}
              onChange={(e) => setIpEdit({ ...ipEdit, value: e.target.value })}
              placeholder="203.0.113.5, 10.0.0.0/24" style={{ resize: 'vertical' }}
            />
            <div className="modal__actions" style={{ marginTop: 14 }}>
              <button className="btn btn--ghost" onClick={() => setIpEdit(null)}>Болих</button>
              <button className="btn" onClick={saveIPs} disabled={ipBusy}>{ipBusy ? '…' : 'Хадгалах'}</button>
            </div>
          </div>
        </div>
      )}

      {whEdit && (
        <div className="modal-overlay" onMouseDown={() => { setWhEdit(null); setWhSecret(''); }}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal__icon modal__icon--primary"><IcoShield /></div>
            <div className="modal__title">Webhook — {whEdit.name}</div>
            <p className="modal__msg">Төлбөр орох үед энэ <b>https URL</b> руу <code>payment.paid</code> мэдэгдэл (HMAC-SHA256 гарын үсэгтэй) илгээнэ. Хоосон → унтраана.</p>
            {whErr && <div className="alert alert--err">{whErr}</div>}
            {whSecret ? (
              <div className="alert alert--ok mono" style={{ wordBreak: 'break-all' }}>webhook_secret (нэг л удаа): {whSecret}</div>
            ) : (
              <input className="input mono" value={whEdit.value} onChange={(e) => setWhEdit({ ...whEdit, value: e.target.value })} placeholder="https://partner.example/webhooks/wallet" />
            )}
            <div className="modal__actions" style={{ marginTop: 14 }}>
              <button className="btn btn--ghost" onClick={() => { setWhEdit(null); setWhSecret(''); }}>{whSecret ? 'Хаах' : 'Болих'}</button>
              {!whSecret && <button className="btn" onClick={saveWebhook} disabled={whBusy}>{whBusy ? '…' : 'Хадгалах'}</button>}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card__title"><IcoCheck /> Шинэ client үүсгэх</h3>
        {err && <div className="alert alert--err">{err}</div>}

        {created ? (
          <div>
            <div className="alert alert--ok"><IcoCheck /> Client амжилттай үүслээ. client_secret зөвхөн ОДОО харагдана — заавал хадгална уу!</div>
            <div className="creds">
              <div className="creds__row"><span className="creds__k">Нэр</span><span>{created.name}</span></div>
              <div className="creds__row"><span className="creds__k">Client ID</span><span className="mono">{created.client_id}</span></div>
              <div className="creds__row"><span className="creds__k">Client Secret</span><span className="mono creds__secret">{created.client_secret}</span></div>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={downloadCreds}><IcoReports /> Креденшл PDF татах</button>
              <button className="btn btn--ghost" onClick={() => setCreated(null)}>Хаах</button>
            </div>
          </div>
        ) : (
          <form className="row" onSubmit={create}>
            <div className="field" style={{ margin: 0, flex: 1 }}>
              <label>Client-ийн нэр</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Жишээ: ACME ХХК" autoFocus />
            </div>
            <button className="btn" type="submit" disabled={busy || !name.trim()}>{busy ? '…' : 'Үүсгэх'}</button>
          </form>
        )}
        <p className="muted" style={{ fontSize: 12.5, margin: '12px 2px 0' }}>
          Зөвхөн нэр өгөхөд хангалттай — <span className="mono">client_id</span> автоматаар үүснэ. client_secret-ийг үүсгэх үед нэг л удаа харуулна (PDF-ээр татаж хадгална уу).
        </p>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search grow">
            <IcoSearch />
            <input className="input" placeholder="client_id эсвэл нэрээр хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="seg">
            <button className={filt === 'all' ? 'on' : ''} onClick={() => setFilt('all')}>Бүгд</button>
            <button className={filt === 'active' ? 'on' : ''} onClick={() => setFilt('active')}>Идэвхтэй</button>
            <button className={filt === 'inactive' ? 'on' : ''} onClick={() => setFilt('inactive')}>Идэвхгүй</button>
          </div>
          <span className="count-pill">{filtered.length} / {clients.length}</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>client_id</th><th>Нэр</th><th>Төлөв</th><th>Зөвшөөрсөн IP</th><th>Сүүлд</th><th style={{ textAlign: 'right' }}>Үйлдэл</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.client_id}>
                  <td className="mono">{c.client_id}</td>
                  <td>{c.name}</td>
                  <td><span className={`badge ${c.active ? 'badge--ok' : 'badge--off'}`}>{c.active ? 'идэвхтэй' : 'идэвхгүй'}</span></td>
                  <td className="mono" style={{ fontSize: 11, color: c.allowed_ips ? 'var(--fg)' : 'var(--faint)' }}>
                    {c.allowed_ips ? c.allowed_ips : 'Бүх IP'}
                  </td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{c.last_used_at ? c.last_used_at.slice(0, 10) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 7 }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => setIpEdit({ id: c.client_id, name: c.name || c.client_id, value: c.allowed_ips ?? '' })}>IP</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => { setWhSecret(''); setWhErr(''); setWhEdit({ id: c.client_id, name: c.name || c.client_id, value: c.webhook_url ?? '' }); }} title={c.webhook_url || 'Webhook тохируулаагүй'}>{c.webhook_url ? 'WH ✓' : 'WH'}</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => downloadDoc(c)}><IcoReports /> PDF</button>
                      <button className={`btn btn--sm ${c.active ? 'btn--red' : 'btn--green'}`} onClick={() => toggle(c.client_id, !c.active)}>
                        {c.active ? 'Идэвхгүй' : 'Идэвхжүүлэх'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty"><IcoInbox /><p>{clients.length ? 'Шүүлтэнд тохирох client алга.' : 'Client алга.'}</p></div>
          )}
        </div>
      </div>
    </>
  );
}
