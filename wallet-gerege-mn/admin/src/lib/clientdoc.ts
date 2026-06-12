// Wallet API client-ийн холболтын баримтыг (creds + integration guide) PDF болгож
// татах. Браузерын print → "Save as PDF" ашиглана (gadny хамааралгүй, Кирилл
// бүрэн дэмжинэ). Зөвхөн browser талд (event handler) дуудна.

const WALLET = 'https://wallet.gerege.mn';

function esc(s: string): string {
  return (s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

export interface DocOpts { clientId: string; name: string; secret?: string; createdAt?: string }

export function buildCredsHTML(o: DocOpts): string {
  const secret = o.secret
    ? esc(o.secret)
    : '<span style="color:#888">(үүсгэх үед хадгалсан secret-ээ ашиглана уу — энд дахин харуулахгүй)</span>';
  const title = `wallet-client-${o.clientId}`;
  return `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.5; margin: 0; }
  .head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { width: 38px; height: 38px; border-radius: 9px; background: #4f46e5; color: #fff; display: grid; place-items: center; font-size: 20px; font-weight: 700; }
  .head h1 { font-size: 16px; margin: 0; }
  .head .sub { color: #6b7280; font-size: 11px; }
  .creds { border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
  .creds .r { display: flex; border-bottom: 1px solid #eceef2; }
  .creds .r:last-child { border-bottom: none; }
  .creds .k { width: 130px; flex: none; background: #f7f8fb; padding: 9px 12px; color: #6b7280; font-size: 11px; }
  .creds .v { padding: 9px 12px; font-family: ui-monospace, Menlo, Consolas, monospace; word-break: break-all; }
  .sec { color: #059669; }
  h2 { font-size: 13px; margin: 18px 0 8px; color: #4f46e5; }
  pre { background: #f6f7f9; border: 1px solid #e5e7eb; border-radius: 6px; padding: 11px 13px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; white-space: pre-wrap; word-break: break-word; margin: 0 0 10px; }
  table.ep { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.ep td { padding: 5px 8px; border-bottom: 1px solid #eceef2; vertical-align: top; }
  table.ep td.m { font-family: ui-monospace, Menlo, monospace; white-space: nowrap; color: #374151; }
  .warn { margin-top: 18px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #b91c1c; font-size: 11px; }
  .foot { margin-top: 14px; color: #9ca3af; font-size: 10px; }
</style></head><body>
  <div class="head">
    <div class="logo">₮</div>
    <div><h1>Gerege Core Banking — Wallet API</h1><div class="sub">Client холболтын мэдээлэл (client_credentials)</div></div>
  </div>

  <div class="creds">
    <div class="r"><div class="k">Client нэр</div><div class="v">${esc(o.name) || '-'}</div></div>
    <div class="r"><div class="k">Client ID</div><div class="v">${esc(o.clientId)}</div></div>
    <div class="r"><div class="k">Client Secret</div><div class="v sec">${secret}</div></div>
    <div class="r"><div class="k">Үүсгэсэн</div><div class="v">${esc(o.createdAt ?? '')}</div></div>
  </div>

  <h2>1) Access токен авах (OAuth2 client_credentials)</h2>
  <pre>POST ${WALLET}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&amp;client_id=${esc(o.clientId)}&amp;client_secret=&lt;secret&gt;</pre>
  <pre>curl -X POST ${WALLET}/oauth/token \\
  -d "grant_type=client_credentials&amp;client_id=${esc(o.clientId)}&amp;client_secret=&lt;secret&gt;"</pre>
  <p style="font-size:11px;color:#374151">Хариу: <code>{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600 }</code><br>
  (эсвэл HTTP Basic: <code>Authorization: Basic base64(client_id:client_secret)</code>)</p>

  <h2>2) Хэтэвчид хандах — Authorization: Bearer &lt;access_token&gt;</h2>
  <table class="ep">
    <tr><td class="m">GET&nbsp;&nbsp;&nbsp;/api/v1/wallet</td><td>хэтэвч (байхгүй бол нээнэ)</td></tr>
    <tr><td class="m">GET&nbsp;&nbsp;&nbsp;/api/v1/wallet/transactions</td><td>гүйлгээний түүх</td></tr>
    <tr><td class="m">POST&nbsp;&nbsp;/api/v1/wallet/withdraw</td><td>зарлага</td></tr>
    <tr><td class="m">POST&nbsp;&nbsp;/api/v1/wallet/transfer</td><td>шилжүүлэг</td></tr>
    <tr><td class="m">POST&nbsp;&nbsp;/api/v1/wallet/holds</td><td>мөнгө барьцаалах</td></tr>
    <tr><td class="m">DELETE /api/v1/wallet/holds/:id</td><td>барьцаа суллах</td></tr>
    <tr><td class="m">POST&nbsp;&nbsp;/api/v1/wallet/holds/:id/settle</td><td>барьцаа хаах (capture)</td></tr>
    <tr><td class="m">POST&nbsp;&nbsp;/api/v1/wallet/transactions/:id/reverse</td><td>гүйлгээ буцаах</td></tr>
  </table>
  <p style="font-size:11px;color:#374151;margin-top:8px">Суурь хаяг: <b>${WALLET}</b> · client = өөрийн хэтэвч · Дүн бүгд MNT (minor unit) · OpenAPI: ${WALLET}/openapi.yaml</p>

  <div class="warn">⚠ client_secret-ийг аюулгүй хадгална уу — дахин харуулах боломжгүй. Алдагдвал админ шинэ client үүсгэж secret-ийг сольно.</div>
  <div class="foot">Gerege Core Banking Platform · admin.wallet.gerege.mn</div>
</body></html>`;
}

// openPdf нь HTML-ийг шинэ цонхонд бичиж print dialog нээнэ ("Save as PDF").
export function openPdf(html: string): void {
  const w = window.open('', '_blank', 'width=860,height=960');
  if (!w) {
    alert('Popup хаагдсан байна. PDF татахын тулд popup-г зөвшөөрнө үү.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 350);
}
