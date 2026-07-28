// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Шилжилт / эрхийн бодлогын тест. Аюулгүй байдлын хилийг тодорхойлдог тул
// цагаан жагсаалтад гар хүрэх бүрд энэ тест хамгаалалт болно.
// Ажиллуулах: `npm test` (tsc → `node --test dist/*.test.js`).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeAppURL, resolveAppURL, DEFAULT_APP_URL, DEV_APP_URL } from './config';
import { allowPermission, classifyURL, desktopUserAgent, hostMatches, isAuthHost } from './policy';

const APP = 'https://template.gerege.mn';

test('аппын өөрийн хаягууд цонхон дотор ачаална', () => {
  assert.equal(classifyURL(`${APP}/me/dashboard`, APP), 'allow');
  assert.equal(classifyURL(`${APP}/`, APP), 'allow');
});

test('нэвтрэлт / интеграцийн хостууд цонхон дотор ачаална', () => {
  assert.equal(classifyURL('https://sso.gerege.mn/oauth2/auth', APP), 'allow');
  assert.equal(classifyURL('https://eidmongolia.mn/v3/start', APP), 'allow');
  assert.equal(classifyURL('https://accounts.google.com/o/oauth2/v2/auth', APP), 'allow');
  assert.equal(classifyURL('https://www.dropbox.com/oauth2/authorize', APP), 'allow');
});

test('гадаад холбоос системийн хөтчөөр нээгдэнэ', () => {
  assert.equal(classifyURL('https://github.com/gerege-systems', APP), 'external');
  assert.equal(classifyURL('https://dgov.mn/help', APP), 'external');
  assert.equal(classifyURL('mailto:info@gerege.mn', APP), 'external');
  assert.equal(classifyURL('geregesmartid://approve?sessionId=1', APP), 'external');
});

test('скрипт схемүүд бүрэн хаагдана', () => {
  assert.equal(classifyURL('javascript:alert(1)', APP), 'block');
  assert.equal(classifyURL('data:text/html,<script>1</script>', APP), 'block');
  assert.equal(classifyURL('vbscript:msgbox', APP), 'block');
  assert.equal(classifyURL('энэ бол хаяг биш', APP), 'block');
});

test('blob зөвхөн аппын өөрийн origin-оос', () => {
  assert.equal(classifyURL(`blob:${APP}/8f0c-uuid`, APP), 'allow');
  assert.equal(classifyURL('blob:https://evil.example/8f0c-uuid', APP), 'block');
});

test('about:blank popup зөвшөөрөгдөнө, бусад about хаагдана', () => {
  assert.equal(classifyURL('about:blank', APP), 'allow');
  assert.equal(classifyURL('about:config', APP), 'block');
});

test('төстэй нэртэй домэйн цагаан жагсаалтад орохгүй', () => {
  assert.equal(classifyURL('https://gerege.mn.evil.com/', APP), 'external');
  assert.equal(classifyURL('https://notgerege.mn/', APP), 'external');
  assert.equal(classifyURL('https://faketemplate.gerege.mn.attacker.io/', APP), 'external');
  assert.equal(hostMatches('gerege.mn.evil.com', '.gerege.mn'), false);
  assert.equal(isAuthHost('accounts.google.com.evil.io'), false);
});

test('локал хөгжүүлэлтийн origin өөрөө аппын origin болно', () => {
  assert.equal(classifyURL('http://localhost:3000/me/ai', DEV_APP_URL), 'allow');
  assert.equal(classifyURL('http://localhost:3001/', DEV_APP_URL), 'external');
});

test('эрх — зөвхөн аппын origin, зөвхөн цагаан жагсаалт', () => {
  assert.equal(allowPermission('media', APP, APP, ['audio']), true);
  assert.equal(allowPermission('media', APP, APP, ['audio', 'video']), false, 'камер хаалттай');
  assert.equal(allowPermission('geolocation', APP, APP), false);
  assert.equal(allowPermission('media', 'https://evil.example', APP, ['audio']), false);
  assert.equal(allowPermission('notifications', APP, APP), true);
});

test('User-Agent-аас бүрхүүлийн шошго хасагдана', () => {
  const raw =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Gerege Template/1.0.0 Chrome/140.0.0.0 Electron/43.2.0 Safari/537.36';
  const ua = desktopUserAgent(raw, 'Gerege Template');
  assert.ok(!ua.includes('Electron'));
  assert.ok(!ua.includes('Gerege Template'));
  assert.ok(ua.includes('Chrome/140.0.0.0'));
  assert.ok(!ua.includes('  '));
});

test('хаяг цэгцлэх — зөвхөн http/https origin', () => {
  assert.equal(normalizeAppURL('template.gerege.mn'), APP);
  assert.equal(normalizeAppURL(' https://template.gerege.mn/me/dashboard?a=1 '), APP);
  assert.equal(normalizeAppURL('http://localhost:3000'), DEV_APP_URL);
  assert.equal(normalizeAppURL('file:///etc/passwd'), null);
  assert.equal(normalizeAppURL('javascript:alert(1)'), null);
  assert.equal(normalizeAppURL(''), null);
  assert.equal(normalizeAppURL(undefined), null);
});

test('хаягийн эрэмбэ — орчин → хадгалсан → үндсэн', () => {
  assert.equal(resolveAppURL('http://localhost:3000', 'https://staging.gerege.mn'), DEV_APP_URL);
  assert.equal(resolveAppURL(undefined, 'https://staging.gerege.mn'), 'https://staging.gerege.mn');
  assert.equal(resolveAppURL(undefined, undefined), DEFAULT_APP_URL);
  assert.equal(resolveAppURL('хог', 'хог'), DEFAULT_APP_URL);
});
