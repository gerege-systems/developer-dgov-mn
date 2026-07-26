// Gerege Systems Development Team & Claude AI, 2026

import { describe, it, expect } from 'vitest';
import { takeSentence, plainText } from './chatStream';

describe('takeSentence', () => {
  it('дууссан өгүүлбэрийг л таслана', () => {
    const [s, rest] = takeSentence('Сайн байна уу. Таны асуулт');
    expect(s).toBe('Сайн байна уу.');
    expect(rest).toBe('Таны асуулт');
  });

  it('дуусаагүй өгүүлбэрийг хүлээнэ', () => {
    const [s, rest] = takeSentence('Сайн байна уу гэж');
    expect(s).toBeNull();
    expect(rest).toBe('Сайн байна уу гэж');
  });

  it('хэт богино хэсгийг дараагийнхтай нийлүүлнэ', () => {
    // «За.» дангаараа дуугаргахад таагүй тул дараагийн өгүүлбэртэй нийлнэ.
    const [s] = takeSentence('За. Танд eID-ээр нэвтрэх боломж бий. Үлдсэн');
    expect(s).toBe('За. Танд eID-ээр нэвтрэх боломж бий.');
  });

  it('шинэ мөрийг ч өгүүлбэрийн төгсгөл гэж үзнэ', () => {
    const [s, rest] = takeSentence('Гурван арга байна\n1. QR код');
    expect(s).toBe('Гурван арга байна');
    expect(rest).toBe('1. QR код');
  });
});

describe('plainText', () => {
  it('markdown тэмдэглэгээг цэвэрлэнэ (нүдэнд ч, чангаар уншихад ч харагдахгүй)', () => {
    const md = '**QR код** — дэлгэц дээрх кодыг уншуулна.\n* Эхний зүйл\n## Гарчиг\n`код`';
    const out = plainText(md);
    expect(out).not.toContain('**');
    expect(out).not.toContain('##');
    expect(out).not.toContain('`');
    expect(out).toContain('QR код');
    expect(out).toContain('• Эхний зүйл');
  });

  it('холбоосоос зөвхөн текстийг үлдээнэ', () => {
    expect(plainText('[Баримт](https://example.com) үзнэ үү')).toBe('Баримт үзнэ үү');
  });

  it('жагсаалтын дугаарыг хэвээр үлдээнэ', () => {
    expect(plainText('1. QR код\n2. Регистр')).toBe('1. QR код\n2. Регистр');
  });
});

describe('plainText — урсгалын дундах хэсэгчилсэн текст', () => {
  it('хаагдаагүй тод тэмдгийг нуна', () => {
    expect(plainText('Гурван арга бий: **QR')).toBe('Гурван арга бий: QR');
  });
});
