"use client";

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, X } from 'lucide-react';
import { useT } from '@/lib/lang';

interface Role {
  id: number;
  key: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
}
interface Permission {
  key: string;
  label: string;
  category: string;
}
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

const ADMIN_KEY = 'admin';

export default function RolesManager() {
  const { T, tRole, tPerm } = useT();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [draft, setDraft] = useState<Record<number, Set<string>>>({});
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', key: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const [rRes, pRes] = await Promise.all([
        fetch('/api/rbac/roles', { method: 'GET' }),
        fetch('/api/rbac/permissions', { method: 'GET' }),
      ]);
      const rBody = (await rRes.json()) as ApiResponse<Role[]>;
      const pBody = (await pRes.json()) as ApiResponse<Permission[]>;
      if (pBody.ok) setPerms(pBody.data ?? []);
      if (rBody.ok) {
        const list = rBody.data ?? [];
        setRoles(list);
        const d: Record<number, Set<string>> = {};
        for (const r of list) d[r.id] = new Set(r.permissions);
        setDraft(d);
      } else {
        setRoles([]);
        setError(rBody.message || T('roles.loadError'));
      }
    } catch {
      setRoles([]);
      setError(T('roles.loadError'));
    }
  }, [T]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (roleId: number, key: string) => {
    setDraft((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [roleId]: next };
    });
  };

  const save = async (role: Role) => {
    setSavingId(role.id);
    setError('');
    try {
      const res = await fetch(`/api/rbac/roles/${role.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: Array.from(draft[role.id] ?? []) }),
      });
      const b = (await res.json()) as ApiResponse<unknown>;
      if (!b.ok) setError(b.message || T('roles.saveError'));
      else await load();
    } catch {
      setError(T('roles.saveError'));
    } finally {
      setSavingId(null);
    }
  };

  const createRole = async () => {
    if (!form.name.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, key: form.key }),
      });
      const b = (await res.json()) as ApiResponse<unknown>;
      if (b.ok) {
        setAdding(false);
        setForm({ name: '', key: '' });
        await load();
      } else setError(b.message || T('roles.createError'));
    } catch {
      setError(T('roles.createError'));
    }
  };

  const remove = async (role: Role) => {
    if (!window.confirm(`${role.name} — ${T('roles.deleteConfirm')}`)) return;
    setError('');
    try {
      const res = await fetch(`/api/rbac/roles/${role.id}`, { method: 'DELETE' });
      const b = (await res.json()) as ApiResponse<unknown>;
      if (b.ok) await load();
      else setError(b.message || T('roles.deleteError'));
    } catch {
      setError(T('roles.deleteError'));
    }
  };

  if (roles === null) {
    return (
      <div className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 16 }}>
        <Loader2 size={16} strokeWidth={2} className="spin" />
        <span>{T('users.loading')}</span>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert--danger" role="alert">{error}</div>}

      <div className="users__head">
        {!adding && (
          <button className="btn btn--primary" type="button" onClick={() => { setAdding(true); setError(''); }}>
            <Plus size={16} strokeWidth={2} />
            <span>{T('roles.add')}</span>
          </button>
        )}
      </div>

      {adding && (
        <div className="card" style={{ padding: 16, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div className="field">
            <label className="field__label" htmlFor="r-name">{T('roles.name')}</label>
            <input id="r-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={T('roles.namePh')} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="r-key">{T('roles.key')}</label>
            <input id="r-key" className="input mono" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="sales_manager" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" type="button" onClick={createRole}><Save size={16} strokeWidth={2} /><span>{T('common.create')}</span></button>
            <button className="btn btn--secondary" type="button" onClick={() => setAdding(false)}><X size={16} strokeWidth={2} /><span>{T('common.cancel')}</span></button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="rbac-matrix">
          <thead>
            <tr>
              <th>{T('roles.col.permission')}</th>
              {roles.map((r) => <th key={r.id}>{tRole(r.key, r.name)}</th>)}
            </tr>
          </thead>
          <tbody>
            {perms.map((p) => (
              <tr key={p.key}>
                <td>
                  <span className="rbac-perm-label">
                    {tPerm(p.key, p.label)}
                    <small className="mono">{p.key}</small>
                  </span>
                </td>
                {roles.map((r) => {
                  const isAdmin = r.key === ADMIN_KEY;
                  const checked = isAdmin || (draft[r.id]?.has(p.key) ?? false);
                  return (
                    <td key={r.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAdmin}
                        onChange={() => toggle(r.id, p.key)}
                        aria-label={`${tRole(r.key, r.name)}: ${tPerm(p.key, p.label)}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td />
              {roles.map((r) => (
                <td key={r.id}>
                  {r.key !== ADMIN_KEY && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button className="btn btn--primary btn--sm" type="button" onClick={() => save(r)} disabled={savingId === r.id} title={T('common.save')}>
                        {savingId === r.id ? <Loader2 size={13} strokeWidth={2} className="spin" /> : <Save size={13} strokeWidth={2} />}
                      </button>
                      {!r.is_system && (
                        <button className="btn btn--ghost btn--sm" type="button" onClick={() => remove(r)} title={T('common.delete')}>
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
