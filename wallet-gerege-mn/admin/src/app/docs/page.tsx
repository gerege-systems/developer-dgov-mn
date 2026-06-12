import React from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { IcoBook, IcoCheck, IcoShield, IcoAccounts, IcoReports, IcoCoin } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Баримт (API) — Gerege Core Banking' };

const WALLET = 'https://wallet.gerege.mn';

function M({ m }: { m: string }) {
  const k = m === 'DELETE' ? 'del' : m.toLowerCase();
  return <span className={`method method--${k}`}>{m}</span>;
}

const endpoints: { m: string; path: string; desc: string }[] = [
  { m: 'GET', path: '/api/v1/wallet', desc: 'Хэтэвч (байхгүй бол нээнэ) — үлдэгдэл, төлөв, IBAN' },
  { m: 'GET', path: '/api/v1/wallet/transactions', desc: 'Гүйлгээний түүх (offset, limit)' },
  { m: 'POST', path: '/api/v1/wallet/withdraw', desc: 'Зарлага гаргах' },
  { m: 'POST', path: '/api/v1/wallet/transfer', desc: 'Бусад дансруу шилжүүлэг' },
  { m: 'POST', path: '/api/v1/wallet/holds', desc: 'Мөнгө түр барьцаалах' },
  { m: 'DELETE', path: '/api/v1/wallet/holds/:id', desc: 'Барьцаа суллах' },
  { m: 'POST', path: '/api/v1/wallet/holds/:id/settle', desc: 'Барьцаа хаах (capture)' },
  { m: 'POST', path: '/api/v1/wallet/transactions/:id/reverse', desc: 'Гүйлгээ буцаах' },
];

export default function DocsPage() {
  return (
    <Shell title="Баримт (API)" sub="Wallet API холболтын гарын авлага · client_credentials">
      <div className="doc">
        <div className="card">
          <h3 className="card__title"><IcoBook /> Танилцуулга</h3>
          <p>
            Бусад систем <b>client_id / client_secret</b>-ээр (OAuth2 client_credentials) wallet-ийн access токен авч
            хэтэвчийн API-д хандана. <b>client = өөрийн хэтэвч</b> (токены client_id нь эзэн). Иргэд <code>me.gerege.mn</code>-ээр
            нэвтэрч өөрсдийн хэтэвчийг ашиглана.
          </p>
          <ul>
            <li>Суурь хаяг: <code>{WALLET}</code></li>
            <li>Дүн бүгд <b>MNT minor unit</b> (decimal = 0, тул minor = ₮; <code>balance_minor: 1000</code> = 1000₮)</li>
            <li>Бүх мутацид <code>Idempotency-Key</code> header дэмжинэ (давхар бичилтээс сэргийлнэ)</li>
            <li>OpenAPI: <code>{WALLET}/openapi.yaml</code></li>
          </ul>
          <Link className="btn" href="/docs/swagger"><IcoBook /> Swagger UI (интерактив) нээх →</Link>
        </div>

        <div className="card">
          <h3 className="card__title"><IcoCheck /> 1. Access токен авах</h3>
          <p><M m="POST" /> <code>{WALLET}/oauth/token</code> — <code>grant_type=client_credentials</code> (form-encoded эсвэл HTTP Basic).</p>
          <pre>{`curl -X POST ${WALLET}/oauth/token \\
  -d "grant_type=client_credentials&client_id=<id>&client_secret=<secret>"`}</pre>
          <p>Хариу:</p>
          <pre>{`{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "wallet"
}`}</pre>
          <p>Дараа нь хүсэлт бүрд <code>Authorization: Bearer &lt;access_token&gt;</code> header нэмнэ. Токен богино настай тул дуусахад дахин авна.</p>
        </div>

        <div className="card">
          <h3 className="card__title"><IcoAccounts /> 2. Хэтэвчийн endpoint-ууд</h3>
          <p>Бүгд <code>Authorization: Bearer &lt;access_token&gt;</code> шаардана.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Method</th><th>Зам</th><th>Тайлбар</th></tr></thead>
              <tbody>
                {endpoints.map((e) => (
                  <tr key={e.path}>
                    <td><M m={e.m} /></td>
                    <td className="ep">{e.path}</td>
                    <td>{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12 }}>Жишээ — хэтэвч унших:</p>
          <pre>{`curl ${WALLET}/api/v1/wallet \\
  -H "Authorization: Bearer <access_token>"`}</pre>
        </div>

        <div className="card">
          <h3 className="card__title"><IcoShield /> 3. IP whitelist</h3>
          <p>
            Client бүрд <b>зөвшөөрөгдсөн IP/CIDR</b> жагсаалт тохируулж болно (Client-ууд → IP). Тохируулсан бол
            <code>/oauth/token</code>-г зөвхөн тэр IP-аас авна; бусдаас <code>403 ip_not_allowed</code> буцаана. Хоосон бол хязгаарлалтгүй.
          </p>
        </div>

        <div className="card">
          <h3 className="card__title"><IcoCoin /> 4. Цэнэглэлт (top-up)</h3>
          <p>
            Хэтэвч цэнэглэлт нь <b>зөвхөн банкны corporate gateway</b>-ээр (HMAC баталгаажсан webhook <code>/webhooks/bank/topup</code>)
            хийгдэнэ — иргэн/client-ийн endpoint биш. QPay ашиглахгүй. Дотоод double-entry ledger-т <code>deposit</code> гүйлгээ бичигдэнэ.
          </p>
        </div>

        <div className="card">
          <h3 className="card__title"><IcoReports /> 5. Аюулгүй байдал ба ledger</h3>
          <ul>
            <li>Double-entry append-only ledger — гүйлгээ бүр <code>Σ дебит = Σ кредит</code></li>
            <li>RLS: client зөвхөн ӨӨРИЙН хэтэвчид хандана (owner = токены subject)</li>
            <li>Integer-only мөнгө (MNT minor), idempotency keys, bcrypt client secrets</li>
            <li>Rate-limit <code>/oauth/token</code> + API; reconcile (цаг тутам) дебит/кредит тэнцэл шалгана</li>
            <li><code>account_no</code> нь IBAN-нийцтэй (Luhn + MOD-97)</li>
          </ul>
          <p style={{ marginTop: 4 }}>
            Client бүрийн дэлгэрэнгүй холболтын баримтыг <b>Client-ууд</b> хэсгээс PDF-ээр татаж болно.
          </p>
        </div>
      </div>
    </Shell>
  );
}
