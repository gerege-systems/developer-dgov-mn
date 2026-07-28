"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, Plus, Trash2, Sparkles, Eye, EyeOff } from 'lucide-react';
import Alert from '@/components/Alert';
import { getJSON, sendJSON, postJSON } from '@/lib/client';
import { useT, useLang } from '@/lib/lang';
import { pickLang, dict } from '@/lib/i18n';

interface Language {
  code: string;
  label: string;
  locale: string;
  enabled: boolean;
  is_builtin: boolean;
  sort_order: number;
}

interface TranslateResult {
  translated: number;
  skipped: number;
  failed: number;
  warnings?: string[];
}

/**
 * LanguageManager — интерфейсийн хэлийг удирдана (ЗӨВХӨН super admin):
 * нэмэх, идэвхжүүлэх/унтраах, устгах, AI-аар орчуулгыг бөглөх.
 *
 * "AI-аар суулгах" нь ЭНЭ аппын багцлагдсан монгол dictionary-г (lib/i18n.ts)
 * backend руу илгээнэ — түлхүүрийн жагсаалт нь аппынх, платформ түүнийг
 * мэддэггүй. Backend дутуу утгыг Gemini-ээр бөглөж хадгална.
 */
export default function LanguageManager() {
  const { T } = useT();
  const { lang } = useLang();
  const L = (mn: string, en: string, zh?: string, ru?: string) => pickLang(lang, { mn, en, zh, ru });
  const qc = useQueryClient();

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({ code: '', label: '', locale: '' });

  const q = useQuery({
    queryKey: ['admin-languages'],
    queryFn: () => getJSON<Language[]>('/api/admin/languages'),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-languages'] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const res = await postJSON('/api/admin/languages', {
      code: form.code.trim(),
      label: form.label.trim(),
      locale: form.locale.trim(),
    });
    if (!res.ok) {
      setError(res.message || L('Хэл нэмэхэд алдаа.', 'Failed to add language.', '添加语言失败。', 'Не удалось добавить язык.'));
      return;
    }
    setForm({ code: '', label: '', locale: '' });
    setNotice(L(
      'Хэл нэмэгдлээ. Одоо орчуулгыг нь бөглөөд идэвхжүүлнэ үү.',
      'Language added. Fill in the translations, then enable it.',
      '语言已添加。请先补充翻译再启用。',
      'Язык добавлен. Заполните переводы, затем включите его.',
    ));
    refresh();
  };

  const toggle = async (l: Language) => {
    setError('');
    setNotice('');
    const res = await sendJSON(`/api/admin/languages/${l.code}`, 'PATCH', { enabled: !l.enabled });
    if (res.ok) refresh();
    else setError(res.message || L('Өөрчлөхөд алдаа.', 'Failed to update.', '更新失败。', 'Не удалось обновить.'));
  };

  const remove = async (l: Language) => {
    setError('');
    setNotice('');
    if (!confirm(L(
      `"${l.label}" хэлийг устгах уу? Орчуулга нь бүхэлдээ устана.`,
      `Delete "${l.label}"? All its translations will be removed.`,
      `确定删除“${l.label}”吗？其全部翻译都会被移除。`,
      `Удалить «${l.label}»? Все его переводы будут удалены.`,
    ))) return;
    const res = await sendJSON(`/api/admin/languages/${l.code}`, 'DELETE');
    if (res.ok) refresh();
    else setError(res.message || L('Устгахад алдаа.', 'Failed to delete.', '删除失败。', 'Не удалось удалить.'));
  };

  // Дутуу орчуулгыг Gemini-ээр бөглөнө. Багцлагдсан монгол dictionary нь
  // түлхүүрийн эх сурвалж — түүнийг эх текст болгон илгээнэ.
  const install = async (l: Language, overwrite: boolean) => {
    setError('');
    setNotice('');
    setBusy(l.code);
    try {
      const res = await postJSON<TranslateResult>(`/api/admin/languages/${l.code}/translate`, {
        base: dict.mn,
        base_lang: 'mn',
        overwrite,
      });
      if (!res.ok) {
        setError(res.message || L('Орчуулгад алдаа.', 'Translation failed.', '翻译失败。', 'Ошибка перевода.'));
        return;
      }
      const d = res.data;
      setNotice(L(
        `Орчуулга дууслаа — шинэ: ${d?.translated ?? 0}, алгассан: ${d?.skipped ?? 0}, амжилтгүй: ${d?.failed ?? 0}.`,
        `Translation finished — new: ${d?.translated ?? 0}, skipped: ${d?.skipped ?? 0}, failed: ${d?.failed ?? 0}.`,
        `翻译完成 — 新增：${d?.translated ?? 0}，跳过：${d?.skipped ?? 0}，失败：${d?.failed ?? 0}。`,
        `Перевод завершён — новых: ${d?.translated ?? 0}, пропущено: ${d?.skipped ?? 0}, ошибок: ${d?.failed ?? 0}.`,
      ));
      refresh();
    } finally {
      setBusy('');
    }
  };

  const list = q.data ?? [];
  const keyCount = Object.keys(dict.mn).length;

  return (
    <div className="form-grid">
      {error && <Alert kind="danger">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <section className="card">
        <h3><Languages size={16} /> {T('langs.add')}</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {L(
            'Шинэ хэл унтраалттай нэмэгдэнэ. Орчуулгыг AI-аар бөглөсний дараа идэвхжүүлнэ үү.',
            'A new language is added disabled. Fill translations with AI, then enable it.',
            '新语言以停用状态添加。用 AI 补充翻译后再启用。',
            'Новый язык добавляется отключённым. Заполните переводы через AI, затем включите.',
          )}
        </p>
        <form className="form-grid" onSubmit={add}>
          <label>
            <span>{T('langs.code')}</span>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="ja"
              required
              maxLength={32}
            />
          </label>
          <label>
            <span>{T('langs.label')}</span>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="日本語"
              required
              maxLength={80}
            />
          </label>
          <label>
            <span>{T('langs.locale')}</span>
            <input
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
              placeholder="ja-JP"
              maxLength={32}
            />
          </label>
          <button type="submit" className="btn btn--primary">
            <Plus size={15} /> {T('langs.add')}
          </button>
        </form>
      </section>

      <section className="card">
        <h3>{T('langs.list')}</h3>
        {q.isLoading && <p className="muted">{T('langs.loading')}</p>}
        {q.isError && <Alert kind="danger">{T('langs.loadError')}</Alert>}

        <table className="users-table">
          <thead>
            <tr>
              <th>{T('langs.code')}</th>
              <th>{T('langs.label')}</th>
              <th>{T('langs.locale')}</th>
              <th>{T('langs.status')}</th>
              <th aria-label={T('langs.actions')} />
            </tr>
          </thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.code}>
                <td><span className="mono">{l.code}</span></td>
                <td>
                  {l.label}
                  {l.is_builtin && (
                    <span className="chip chip--neutral" style={{ marginInlineStart: 8 }}>
                      {T('langs.builtin')}
                    </span>
                  )}
                </td>
                <td><span className="mono">{l.locale}</span></td>
                <td>
                  <span className={l.enabled ? 'chip chip--success' : 'chip chip--neutral'}>
                    {l.enabled ? T('langs.enabled') : T('langs.disabled')}
                  </span>
                </td>
                <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => install(l, false)}
                    disabled={busy === l.code}
                    title={L(
                      `Дутуу орчуулгыг AI-аар бөглөнө (${keyCount} түлхүүр)`,
                      `Fill missing translations with AI (${keyCount} keys)`,
                      `用 AI 补齐缺失的翻译（${keyCount} 个键）`,
                      `Заполнить недостающие переводы через AI (${keyCount} ключей)`,
                    )}
                  >
                    <Sparkles size={14} /> {busy === l.code ? T('langs.installing') : T('langs.install')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => toggle(l)}
                    title={l.enabled ? T('langs.disable') : T('langs.enable')}
                  >
                    {l.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {!l.is_builtin && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--danger"
                      onClick={() => remove(l)}
                      title={T('common.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {list.length === 0 && !q.isLoading && <p className="muted">{T('langs.empty')}</p>}
      </section>
    </div>
  );
}
