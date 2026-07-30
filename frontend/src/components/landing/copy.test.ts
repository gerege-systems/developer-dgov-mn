// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Landing текстийн mn/en БҮТЭЦ паритетийн тест.
//
// Толь бичгийн паритет (7 хэл) нь одоо `@gerege/ui-core` дотроо шалгагддаг —
// энд давхардуулахгүй. Харин landing нь платформын ӨӨРИЙН текст тул энд
// шалгана: хэл нэмэхэд эсвэл шинэ хэсэг бичихэд нөгөө хэлэнд дутуу үлдвэл
// хуудас хагас орчуулагдсан гарна.
import { describe, it, expect } from 'vitest';
import { landingCopy } from './copy';

/** Платформын landing ямар хэлтэй вэ — `copy.ts`-тэй нэг эх сурвалж. */
const LANGS = ['mn', 'en'] as const;

/** Үүрлэсэн объектын бүх навчны замыг (a.b.0.c) хавтгайруулна. */
function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leafPaths(v, prefix ? `${prefix}.${i}` : String(i)));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe('landing copy parity', () => {
  const mnPaths = leafPaths(landingCopy.mn).sort();

  it('every language has the same landing copy shape', () => {
    for (const lang of LANGS) {
      const paths = leafPaths(landingCopy[lang]).sort();
      expect(paths, `${lang} landing copy-ийн бүтэц зөрж байна`).toEqual(mnPaths);
    }
  });

  it('no landing string is empty', () => {
    for (const lang of LANGS) {
      for (const [path, value] of Object.entries(flatten(landingCopy[lang]))) {
        expect(value.trim().length, `${lang}.${path} хоосон байна`).toBeGreaterThan(0);
      }
    }
  });
});

/** Навчны зам → утга (хоосон мөр барихад). */
function flatten(value: unknown, prefix = '', out: Record<string, string> = {}) {
  if (typeof value === 'string') { out[prefix] = value; return out; }
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}
