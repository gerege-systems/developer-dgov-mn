"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, RotateCcw, Plus, Trash2, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { useT } from '@/lib/lang';
import { getJSON, sendJSON } from '@/lib/client';
import {
  DEFAULT_LANDING_CONFIG,
  normalizeConfig,
  cssVarsStyle,
  type LandingConfig,
  type LocalizedText,
  type LandingButton,
  type LandingBadge,
  type LandingNavItem,
} from '@/lib/landing';
import SigninHeader from '@/components/landing/SigninHeader';
import SigninFooter from '@/components/landing/SigninFooter';
import LandingContent from '@/components/LandingContent';

type Tab = 'theme' | 'content' | 'buttons' | 'badges' | 'nav' | 'advanced';
const TABS: Tab[] = ['theme', 'content', 'buttons', 'badges', 'nav', 'advanced'];

const COLOR_KEYS: Array<keyof LandingConfig['theme']['colors']> = ['danBlue', 'danBlueHover', 'gold', 'bg', 'surface', 'fg', 'border'];
const FONT_KEYS: Array<keyof LandingConfig['theme']['fonts']> = ['displayStack', 'bodyStack', 'monoStack'];
const SIZE_KEYS: Array<keyof LandingConfig['theme']['sizes']> = ['titlePx', 'bodyPx', 'radiusCard', 'radiusInput', 'topbarH'];
const ICON_OPTIONS = ['', 'LogIn', 'ShieldCheck', 'KeyRound', 'Info', 'Lock', 'User', 'Mail', 'Globe', 'ArrowRight', 'Fingerprint'];

const clone = (c: LandingConfig): LandingConfig => JSON.parse(JSON.stringify(c));
const isHex = (v: string) => /^#[0-9a-fA-F]{3,8}$/.test(v.trim());

/**
 * Нүүр хуудасны засварлагч — өнгө/фонт/хэмжээ, текст (mn/en), товч, тэмдэг,
 * цэс, нэмэлт CSS-ийг таб бүрээр тохируулж, баруун талд шууд урьдчилан харна.
 * Хадгалахад бүх баримтыг /api/admin/landing/config руу PUT хийнэ.
 */
export default function LandingEditor() {
  const { T } = useT();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<LandingConfig | null>(null);
  const [tab, setTab] = useState<Tab>('theme');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['admin-landing-config'],
    queryFn: () => getJSON<Partial<LandingConfig>>('/api/admin/landing/config'),
  });

  useEffect(() => {
    if (query.data && !draft) setDraft(normalizeConfig(query.data));
  }, [query.data, draft]);

  const previewStyle = useMemo(
    () => (draft ? (cssVarsStyle(draft.theme) as React.CSSProperties) : {}),
    [draft],
  );

  if (query.isPending || !draft) {
    return (
      <div className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 16 }}>
        <Loader2 size={16} strokeWidth={2} className="spin" /> …
      </div>
    );
  }
  if (query.isError) {
    return <div className="alert alert--danger" role="alert">{T('landing.loadError')}</div>;
  }

  // Draft-ыг immutably шинэчлэх туслах.
  const update = (fn: (d: LandingConfig) => void) => {
    setDraft((prev) => {
      const next = clone(prev ?? DEFAULT_LANDING_CONFIG);
      fn(next);
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    const res = await sendJSON('/api/admin/landing/config', 'PUT', draft);
    if (res.ok) {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['admin-landing-config'] });
    } else {
      setError(res.message || T('landing.saveError'));
    }
    setSaving(false);
  };

  const reset = () => {
    if (typeof window !== 'undefined' && !window.confirm(T('landing.resetConfirm'))) return;
    setDraft(clone(DEFAULT_LANDING_CONFIG));
    setSaved(false);
  };

  return (
    <div className="landing-editor">
      <div className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
        <div className="card__head card__head--with-sub" style={{ padding: 0 }}>
          <span className="card__title">{T('landing.title')}</span>
          <span className="card__sub">{T('landing.sub')}</span>
        </div>

        {/* Таб толгой */}
        <div className="segmented" role="tablist" style={{ flexWrap: 'wrap' }}>
          {TABS.map((tb) => (
            <button
              key={tb}
              role="tab"
              aria-selected={tab === tb}
              className={`segmented__item${tab === tb ? ' is-active' : ''}`}
              onClick={() => setTab(tb)}
              type="button"
            >
              {T(`landing.tab.${tb}` as Parameters<typeof T>[0])}
            </button>
          ))}
        </div>

        {error && <div className="alert alert--danger" role="alert">{error}</div>}

        {tab === 'theme' && <ThemeTab draft={draft} update={update} T={T} />}
        {tab === 'content' && <ContentTab draft={draft} update={update} T={T} />}
        {tab === 'buttons' && <ButtonsTab draft={draft} update={update} T={T} />}
        {tab === 'badges' && <BadgesTab draft={draft} update={update} T={T} />}
        {tab === 'nav' && <NavTab draft={draft} update={update} T={T} />}
        {tab === 'advanced' && <AdvancedTab draft={draft} update={update} T={T} />}

        <div className="form-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--primary" onClick={save} disabled={saving} type="button">
            {saving ? <Loader2 size={15} strokeWidth={2} className="spin" /> : <Save size={15} strokeWidth={2} />}
            <span>{T('landing.save')}</span>
          </button>
          <button className="btn btn--ghost" onClick={reset} type="button">
            <RotateCcw size={15} strokeWidth={2} />
            <span>{T('landing.reset')}</span>
          </button>
          {saved && <span className="muted" style={{ fontSize: 13 }}>{T('landing.saved')}</span>}
        </div>
      </div>

      {/* Урьдчилан харах */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card__head" style={{ padding: '12px 16px' }}>
          <span className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={16} strokeWidth={2} /> {T('landing.preview')}
          </span>
        </div>
        <div className="signin-shell landing-preview" style={previewStyle}>
          <SigninHeader config={draft} />
          <div className="signin-shell__body" style={{ padding: '32px 20px' }}>
            <LandingContent config={draft} />
          </div>
          <SigninFooter config={draft} />
        </div>
        <p className="muted" style={{ fontSize: 12, padding: '10px 16px', margin: 0 }}>{T('landing.previewNote')}</p>
      </div>
    </div>
  );
}

type TFn = ReturnType<typeof useT>['T'];
interface TabProps {
  draft: LandingConfig;
  update: (fn: (d: LandingConfig) => void) => void;
  T: TFn;
}

/** Хоёр хэлтэй (mn/en) талбарын хос оролт. */
function LocalizedField({
  label,
  value,
  onChange,
  textarea,
  T,
}: {
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  textarea?: boolean;
  T: TFn;
}) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <div style={{ display: 'grid', gap: 6 }}>
        {(['mn', 'en'] as const).map((lng) => (
          <div key={lng} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span className="chip" style={{ minWidth: 34, justifyContent: 'center' }}>{lng === 'mn' ? T('landing.langMn') : T('landing.langEn')}</span>
            {textarea ? (
              <textarea
                className="input"
                style={{ flex: 1 }}
                rows={2}
                value={value[lng]}
                onChange={(e) => onChange({ ...value, [lng]: e.target.value })}
              />
            ) : (
              <input
                className="input"
                style={{ flex: 1 }}
                value={value[lng]}
                onChange={(e) => onChange({ ...value, [lng]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeTab({ draft, update, T }: TabProps) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ display: 'grid', gap: 10 }}>
        <strong style={{ fontSize: 13 }}>{T('landing.section.brand')}</strong>
        <div className="form-grid" style={{ display: 'grid', gap: 10 }}>
          <LocalizedField label={T('landing.f.brandName')} value={draft.brand.name} onChange={(v) => update((d) => { d.brand.name = v; })} T={T} />
          <div className="field">
            <label className="field__label">{T('landing.f.logoUrl')}</label>
            <input className="input" value={draft.brand.logoUrl} onChange={(e) => update((d) => { d.brand.logoUrl = e.target.value; })} />
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{T('landing.section.colors')} <span className="muted" style={{ fontWeight: 400 }}>— {T('landing.hint.empty')}</span></strong>
        {COLOR_KEYS.map((key) => (
          <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono muted" style={{ minWidth: 120, fontSize: 12 }}>{key}</span>
            <input
              type="color"
              aria-label={`${key} color picker`}
              value={isHex(draft.theme.colors[key]) ? draft.theme.colors[key] : '#000000'}
              onChange={(e) => update((d) => { d.theme.colors[key] = e.target.value; })}
              style={{ width: 38, height: 30, padding: 0, border: 'none', background: 'none' }}
            />
            <input
              className="input mono"
              style={{ flex: 1, fontSize: 12 }}
              placeholder="oklch(…) / #hex / rgb(…)"
              value={draft.theme.colors[key]}
              onChange={(e) => update((d) => { d.theme.colors[key] = e.target.value; })}
            />
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{T('landing.section.fonts')}</strong>
        {FONT_KEYS.map((key) => (
          <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono muted" style={{ minWidth: 120, fontSize: 12 }}>{key}</span>
            <input className="input" style={{ flex: 1, fontSize: 13 }} value={draft.theme.fonts[key]} onChange={(e) => update((d) => { d.theme.fonts[key] = e.target.value; })} />
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{T('landing.section.sizes')} <span className="muted" style={{ fontWeight: 400 }}>— px</span></strong>
        {SIZE_KEYS.map((key) => (
          <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono muted" style={{ minWidth: 120, fontSize: 12 }}>{key}</span>
            <input className="input" style={{ width: 140, fontSize: 13 }} inputMode="numeric" value={draft.theme.sizes[key]} onChange={(e) => update((d) => { d.theme.sizes[key] = e.target.value; })} />
          </div>
        ))}
      </section>
    </div>
  );
}

function ContentTab({ draft, update, T }: TabProps) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <LocalizedField label={T('landing.f.title')} value={draft.content.title} onChange={(v) => update((d) => { d.content.title = v; })} T={T} />
      <LocalizedField label={T('landing.f.lede')} value={draft.content.lede} onChange={(v) => update((d) => { d.content.lede = v; })} textarea T={T} />
      <LocalizedField label={T('landing.f.helper')} value={draft.content.helper} onChange={(v) => update((d) => { d.content.helper = v; })} textarea T={T} />
      <LocalizedField label={T('landing.f.footer')} value={draft.footer.text} onChange={(v) => update((d) => { d.footer.text = v; })} T={T} />
    </div>
  );
}

/** Массив мөрийг дээш/доош зөөх, устгах толгой (товч/тэмдэг/цэсэнд хуваалцсан). */
function RowControls({ i, len, onMove, onRemove, T }: { i: number; len: number; onMove: (from: number, to: number) => void; onRemove: (i: number) => void; T: TFn }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button className="btn btn--ghost btn--sm" type="button" disabled={i === 0} onClick={() => onMove(i, i - 1)} aria-label={T('landing.btn.up')}><ArrowUp size={14} strokeWidth={2} /></button>
      <button className="btn btn--ghost btn--sm" type="button" disabled={i === len - 1} onClick={() => onMove(i, i + 1)} aria-label={T('landing.btn.down')}><ArrowDown size={14} strokeWidth={2} /></button>
      <button className="btn btn--ghost btn--sm" type="button" onClick={() => onRemove(i)} aria-label={T('landing.btn.remove')}><Trash2 size={14} strokeWidth={2} /></button>
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function ButtonsTab({ draft, update, T }: TabProps) {
  const setBtns = (fn: (b: LandingButton[]) => LandingButton[]) => update((d) => { d.buttons = fn(d.buttons); });
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {draft.buttons.map((btn, i) => (
        <div key={i} className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono muted" style={{ fontSize: 12 }}>#{i + 1} {btn.id}</span>
            <RowControls i={i} len={draft.buttons.length} onMove={(f, t) => setBtns((b) => move(b, f, t))} onRemove={(idx) => setBtns((b) => b.filter((_, k) => k !== idx))} T={T} />
          </div>
          <LocalizedField label={T('landing.f.label')} value={btn.label} onChange={(v) => update((d) => { d.buttons[i].label = v; })} T={T} />
          <div className="field">
            <label className="field__label">{T('landing.f.action')}</label>
            <input className="input mono" style={{ fontSize: 12 }} value={btn.action} onChange={(e) => update((d) => { d.buttons[i].action = e.target.value; })} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="field__label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {T('landing.f.variant')}
              <select className="select" value={btn.variant} onChange={(e) => update((d) => { d.buttons[i].variant = e.target.value as LandingButton['variant']; })}>
                <option value="primary">{T('landing.variant.primary')}</option>
                <option value="secondary">{T('landing.variant.secondary')}</option>
              </select>
            </label>
            <label className="field__label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {T('landing.f.icon')}
              <select className="select" value={btn.icon} onChange={(e) => update((d) => { d.buttons[i].icon = e.target.value; })}>
                {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic || '—'}</option>)}
              </select>
            </label>
            <label className="field__label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={btn.show} onChange={(e) => update((d) => { d.buttons[i].show = e.target.checked; })} />
              {T('landing.f.show')}
            </label>
          </div>
        </div>
      ))}
      <button className="btn btn--secondary btn--sm" type="button" style={{ justifySelf: 'start' }}
        onClick={() => setBtns((b) => [...b, { id: `btn${b.length + 1}`, label: { mn: 'Товч', en: 'Button' }, action: '/login', variant: 'secondary', icon: '', show: true, order: b.length + 1 }])}>
        <Plus size={14} strokeWidth={2} /> {T('landing.btn.add')}
      </button>
    </div>
  );
}

function BadgesTab({ draft, update, T }: TabProps) {
  const setBadges = (fn: (b: LandingBadge[]) => LandingBadge[]) => update((d) => { d.badges = fn(d.badges); });
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {draft.badges.map((bd, i) => (
        <div key={i} className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono muted" style={{ fontSize: 12 }}>#{i + 1}</span>
            <RowControls i={i} len={draft.badges.length} onMove={(f, t) => setBadges((b) => move(b, f, t))} onRemove={(idx) => setBadges((b) => b.filter((_, k) => k !== idx))} T={T} />
          </div>
          <LocalizedField label={T('landing.f.label')} value={bd.label} onChange={(v) => update((d) => { d.badges[i].label = v; })} T={T} />
          <label className="field__label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={bd.show} onChange={(e) => update((d) => { d.badges[i].show = e.target.checked; })} />
            {T('landing.f.show')}
          </label>
        </div>
      ))}
      <button className="btn btn--secondary btn--sm" type="button" style={{ justifySelf: 'start' }}
        onClick={() => setBadges((b) => [...b, { label: { mn: 'Тэмдэг', en: 'Badge' }, show: true }])}>
        <Plus size={14} strokeWidth={2} /> {T('landing.btn.add')}
      </button>
    </div>
  );
}

function NavTab({ draft, update, T }: TabProps) {
  const setNav = (fn: (n: LandingNavItem[]) => LandingNavItem[]) => update((d) => { d.nav = fn(d.nav); });
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {draft.nav.map((item, i) => (
        <div key={i} className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono muted" style={{ fontSize: 12 }}>#{i + 1}</span>
            <RowControls i={i} len={draft.nav.length} onMove={(f, t) => setNav((n) => move(n, f, t))} onRemove={(idx) => setNav((n) => n.filter((_, k) => k !== idx))} T={T} />
          </div>
          <LocalizedField label={T('landing.f.label')} value={item.label} onChange={(v) => update((d) => { d.nav[i].label = v; })} T={T} />
          <div className="field">
            <label className="field__label">{T('landing.f.href')}</label>
            <input className="input mono" style={{ fontSize: 12 }} value={item.href} onChange={(e) => update((d) => { d.nav[i].href = e.target.value; })} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label className="field__label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={item.external} onChange={(e) => update((d) => { d.nav[i].external = e.target.checked; })} />
              {T('landing.f.external')}
            </label>
            <label className="field__label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={item.show} onChange={(e) => update((d) => { d.nav[i].show = e.target.checked; })} />
              {T('landing.f.show')}
            </label>
          </div>
        </div>
      ))}
      <button className="btn btn--secondary btn--sm" type="button" style={{ justifySelf: 'start' }}
        onClick={() => setNav((n) => [...n, { label: { mn: 'Холбоос', en: 'Link' }, href: '/', external: false, show: true }])}>
        <Plus size={14} strokeWidth={2} /> {T('landing.btn.add')}
      </button>
    </div>
  );
}

function AdvancedTab({ draft, update, T }: TabProps) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="alert" role="note" style={{ fontSize: 13 }}>{T('landing.rawCssNote')}</div>
      <div className="field">
        <label className="field__label">{T('landing.f.rawCss')}</label>
        <textarea
          className="input mono"
          style={{ fontSize: 12, minHeight: 200 }}
          value={draft.rawCss}
          spellCheck={false}
          onChange={(e) => update((d) => { d.rawCss = e.target.value; })}
          placeholder={'.signin-card { box-shadow: 0 10px 40px rgba(0,0,0,.2); }'}
        />
      </div>
    </div>
  );
}
