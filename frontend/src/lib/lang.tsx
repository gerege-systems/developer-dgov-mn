"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  t, permLabel, roleName, localeOf, LANGS, LANG_LABELS, LOCALES,
  type DictKey, type LangCode,
} from './i18n';

const LANG_KEY = 'gerege.lang';

/** Хэрэглэгчид харагдах хэл. Backend-ээс ирнэ; хүрэхгүй бол багцлагдсан жагсаалт. */
export interface LanguageOption {
  code: LangCode;
  label: string;
  locale: string;
}

/**
 * Backend хүрэхгүй үеийн жагсаалт — кодод багцлагдсан дөрвөн хэл. Ингэснээр
 * хэлний сонгогч хэзээ ч хоосон болохгүй.
 */
const BUNDLED_OPTIONS: LanguageOption[] = LANGS.map((code) => ({
  code,
  label: LANG_LABELS[code],
  locale: LOCALES[code],
}));

interface LangCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  /** Идэвхтэй хэлүүд (super admin удирдана). */
  languages: LanguageOption[];
  /** Одоогийн хэлний Intl locale. */
  locale: string;
  /** DB-ээс ирсэн орчуулгын давхарга (багцлагдсан утгыг дарна). */
  overlay: Record<string, string>;
}

const Ctx = createContext<LangCtx>({
  lang: 'mn',
  setLang: () => {},
  languages: BUNDLED_OPTIONS,
  locale: 'mn-MN',
  overlay: {},
});

/**
 * LangProvider нь хэлийг бүхэл аппд хуваалцана. Хоёр эх сурвалжийг нийлүүлнэ:
 *
 *  1. Кодод БАГЦЛАГДСАН dictionary (lib/i18n.ts) — түлхүүрийн эх сурвалж ба
 *     сүлжээгүй / DB унасан үеийн найдвартай суурь.
 *  2. Backend-ийн overlay (`/api/public/languages/{code}/dictionary`) — super
 *     admin-ий удирдсан утга. Байвал багцлагдсаныг дарна.
 *
 * Иймд шинэ хэл (жишээ нь 'ja') нэмэхэд deploy шаардлагагүй бөгөөд орчуулга
 * дутуу байсан ч интерфейс хоосон болохгүй (монгол утга руу унана).
 */
export function LangProvider({ children }: { children: React.ReactNode }) {
  // SSR-тэй тохирохын тулд 'mn'-ээс эхэлж, дараа нь localStorage-аас синк хийнэ.
  const [lang, setLangState] = useState<LangCode>('mn');
  const [languages, setLanguages] = useState<LanguageOption[]>(BUNDLED_OPTIONS);
  const [overlay, setOverlay] = useState<Record<string, string>>({});

  // Идэвхтэй хэлүүд + хадгалсан сонголт.
  useEffect(() => {
    let alive = true;

    (async () => {
      let options = BUNDLED_OPTIONS;
      try {
        const res = await fetch('/api/public/languages', { cache: 'no-store' });
        const body = await res.json();
        const list = Array.isArray(body?.data) ? body.data : [];
        if (list.length > 0) {
          options = list.map((l: { code: string; label: string; locale?: string }) => ({
            code: l.code,
            label: l.label,
            locale: l.locale || l.code,
          }));
        }
      } catch {
        // Backend хүрэхгүй — багцлагдсан жагсаалтаар үргэлжилнэ.
      }
      if (!alive) return;
      setLanguages(options);

      // Хадгалсан сонголт одоо ч идэвхтэй эсэхийг шалгана: super admin түүнийг
      // унтраасан эсвэл устгасан байж болзошгүй.
      try {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved && options.some((o) => o.code === saved)) setLangState(saved);
      } catch {
        /* localStorage хүрэхгүй — өгөгдмөл mn */
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Сонгосон хэлний overlay. Багцлагдсан хэлэнд ч татна — super admin
  // багцлагдсан мөрийг дарж бичсэн байж болно.
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/public/languages/${encodeURIComponent(lang)}/dictionary`, {
          cache: 'no-store',
        });
        const body = await res.json();
        const entries = body?.data?.entries;
        if (alive) setOverlay(entries && typeof entries === 'object' ? entries : {});
      } catch {
        // Overlay нь нэмэлт давхарга — авч чадаагүй бол багцлагдсан утга хэвээр.
        if (alive) setOverlay({});
      }
    })();

    return () => {
      alive = false;
    };
  }, [lang]);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* no-op */
    }
    if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', l);
  }, []);

  const locale = useMemo(
    () => localeOf(lang, languages.find((o) => o.code === lang)?.locale),
    [lang, languages],
  );

  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, languages, locale, overlay }),
    [lang, setLang, languages, locale, overlay],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}

/** useT нь одоогийн хэлээр орчуулах функцууд + lang-г буцаана.
 *  T(key) — статик dictionary түлхүүр (DB overlay нь багцлагдсаныг дарна);
 *  tRole(key, fallback) — backend role нэр (admin/user/manager);
 *  tPerm(key, fallback) — backend permission label;
 *  locale — Intl (огноо/тоо) форматлахад;
 *  languages — идэвхтэй хэлүүд (сонгогчид). */
export function useT() {
  const { lang, locale, overlay, languages } = useLang();
  return {
    lang,
    locale,
    languages,
    T: (key: DictKey) => t(lang, key, overlay),
    tRole: (roleKey: string, fallback: string) => roleName(lang, roleKey, fallback, overlay),
    tPerm: (permKey: string, fallback: string) => permLabel(lang, permKey, fallback, overlay),
  };
}
