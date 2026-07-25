// Gerege Template Platform V3.0
// Gerege Systems Development Team & Claude AI, 2026
//
// Аюулгүй байдлын толгойнууд нь AI-ийн дуут боломжуудыг ЧИМЭЭГҮЙ унтраадаг:
// `Permissions-Policy: microphone=()` байхад хөтөч getUserMedia-г баримтын
// түвшинд хааж, зөвшөөрөл ч асуухгүй; `media-src` дутуу бол `default-src`
// нь TTS-ийн аудио тоглуулалтыг блоклоно. Хоёулаа бодит осол болсон тул
// тохиргоо нь регрессийн тесттэй.

import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config.mjs';

interface HeaderEntry {
  key: string;
  value: string;
}

async function headerMap(): Promise<Record<string, string>> {
  const cfg = nextConfig as { headers?: () => Promise<{ headers: HeaderEntry[] }[]> };
  const rules = (await cfg.headers?.()) ?? [];
  const out: Record<string, string> = {};
  for (const rule of rules) {
    for (const h of rule.headers) out[h.key.toLowerCase()] = h.value;
  }
  return out;
}

describe('security headers', () => {
  it('микрофоныг энэ origin-д зөвшөөрнө (дуут чат ажиллах нөхцөл)', async () => {
    const policy = (await headerMap())['permissions-policy'];
    expect(policy).toContain('microphone=(self)');
    // Хэрэглэдэггүй хүчирхэг API-ууд хаалттай хэвээр.
    expect(policy).toContain('camera=()');
    expect(policy).toContain('geolocation=()');
  });

  it('CSP нь аудио тоглуулалтыг зөвшөөрнө (TTS хариу)', async () => {
    const csp = (await headerMap())['content-security-policy'];
    expect(csp).toContain("media-src 'self' data: blob:");
  });

  it('CSP нь frame болон base-uri-г хаасан хэвээр', async () => {
    const csp = (await headerMap())['content-security-policy'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
