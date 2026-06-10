"use client";

import { useCallback, useEffect, useState } from 'react';
import { Trash2, Loader2, Check, Ban } from 'lucide-react';
import { useT } from '@/lib/lang';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role_id: number;
  active: boolean;
  created_at: string;
}
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

interface Props {
  currentUserId: string;
  /** readOnly бол зөвхөн харах горим. */
  readOnly?: boolean;
}

export default function UsersManager({ currentUserId, readOnly = false }: Props) {
  const { T, lang, tRole } = useT();
  const [items, setItems] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<{ id: number; key: string; name: string }[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [uRes, rRes] = await Promise.all([
        fetch('/api/admin/users', { method: 'GET' }),
        fetch('/api/rbac/roles', { method: 'GET' }),
      ]);
      const body = (await uRes.json()) as ApiResponse<AdminUser[]>;
      const rBody = (await rRes.json()) as ApiResponse<{ id: number; key: string; name: string }[]>;
      if (rBody.ok) setRoles(rBody.data ?? []);
      if (body.ok) setItems(body.data ?? []);
      else {
        setItems([]);
        setError(body.message || T('users.loadError'));
      }
    } catch {
      setItems([]);
      setError(T('users.loadError'));
    }
  }, [T]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (url: string, method: string, body?: unknown) => {
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const b = (await res.json()) as ApiResponse<unknown>;
      if (b.ok) void load();
      else setError(b.message || T('users.actionError'));
    } catch {
      setError(T('users.actionError'));
    }
  };

  const changeRole = (id: string, roleId: number) => mutate(`/api/admin/users/${id}/role`, 'PUT', { role_id: roleId });
  const toggleActive = (u: AdminUser) => mutate(`/api/admin/users/${u.id}/active`, 'PUT', { active: !u.active });
  const remove = (id: string) => {
    if (!window.confirm(T('users.deleteConfirm'))) return;
    void mutate(`/api/admin/users/${id}`, 'DELETE');
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'mn-MN', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="users">
      {error && <div className="alert alert--danger" role="alert">{error}</div>}

      {items === null && (
        <div className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 16 }}>
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>{T('users.loading')}</span>
        </div>
      )}

      {items !== null && items.length === 0 && !error && (
        <div className="card" style={{ padding: 24 }}><p className="muted">{T('users.empty')}</p></div>
      )}

      {items !== null && items.length > 0 && (
        <div className="card users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>{T('users.col.name')}</th>
                <th>{T('users.col.email')}</th>
                <th>{T('users.col.role')}</th>
                <th>{T('users.col.status')}</th>
                <th>{T('users.col.created')}</th>
                {!readOnly && <th aria-label="actions" />}
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.username}
                      {isSelf && <span className="chip chip--neutral" style={{ marginLeft: 8 }}>{T('users.you')}</span>}
                    </td>
                    <td className="mono">{u.email}</td>
                    <td>
                      {readOnly ? (
                        <span>{(() => {
                          const r = roles.find((x) => x.id === u.role_id);
                          return r ? tRole(r.key, r.name) : u.role_id;
                        })()}</span>
                      ) : (
                        <select
                          className="input users-table__role"
                          value={u.role_id}
                          disabled={isSelf}
                          onChange={(e) => changeRole(u.id, Number(e.target.value))}
                        >
                          {roles.map((r) => <option key={r.id} value={r.id}>{tRole(r.key, r.name)}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      {u.active
                        ? <span className="chip chip--success">{T('users.active')}</span>
                        : <span className="chip chip--neutral">{T('users.inactive')}</span>}
                    </td>
                    <td className="mono">{fmtDate(u.created_at)}</td>
                    {!readOnly && (
                      <td className="users-table__actions">
                        {!isSelf && (
                          <>
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() => toggleActive(u)}
                              title={u.active ? T('users.deactivate') : T('users.activate')}
                            >
                              {u.active ? <Ban size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2} />}
                            </button>
                            <button className="btn btn--ghost btn--sm" type="button" onClick={() => remove(u.id)} title={T('common.delete')}>
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
