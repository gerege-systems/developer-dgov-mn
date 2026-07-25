// Government Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// i18n dict-ийн mn/en/zh түлхүүр паритетийн тест. CLAUDE.md конвенц: түлхүүр бүр
// гурван хэлэнд ЗААВАЛ байх ёстой — энэ тест дутуу орчуулгыг CI-д барина.
// Landing-ийн copy.ts мөн ижил зарчмаар шалгагдана.
import { describe, it, expect } from 'vitest';
import { dict, LANGS } from './i18n';
import { landingCopy } from '@/components/landing/copy';

/** Үүрлэсэн объектын бүх навчны замыг (a.b.0.c) хавтгайруулна. */
function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leafPaths(v, prefix ? `${prefix}.${i}` : String(i)));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe('i18n dictionary parity', () => {
  const mnKeys = Object.keys(dict.mn).sort();

  it('every language has the exact same key set as mn', () => {
    for (const lang of LANGS) {
      const table = dict[lang] as Record<string, string>;
      const missing = mnKeys.filter((k) => !(k in table));
      const extra = Object.keys(table).filter((k) => !(k in dict.mn));
      expect(missing, `${lang}-д дутуу түлхүүрүүд: ${missing.join(', ')}`).toEqual([]);
      expect(extra, `${lang}-д илүү түлхүүрүүд: ${extra.join(', ')}`).toEqual([]);
    }
  });

  it('no key has an empty translation', () => {
    for (const lang of LANGS) {
      const table = dict[lang] as Record<string, string>;
      for (const [k, v] of Object.entries(table)) {
        expect(typeof v, `${lang}.${k} нь string байх ёстой`).toBe('string');
        expect(v.trim().length, `${lang}.${k} хоосон байна`).toBeGreaterThan(0);
      }
    }
  });
});

describe('landing copy parity', () => {
  const mnPaths = leafPaths(landingCopy.mn).sort();

  it('every language has the same landing copy shape', () => {
    for (const lang of LANGS) {
      const paths = leafPaths(landingCopy[lang]).sort();
      expect(paths, `${lang} landing copy-ийн бүтэц зөрж байна`).toEqual(mnPaths);
    }
  });
});
