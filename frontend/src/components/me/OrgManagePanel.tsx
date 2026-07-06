"use client";

// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, UserPlus, Unlink } from 'lucide-react';
import { useT } from '@/lib/lang';
import { getJSON, postJSON, sendJSON } from '@/lib/client';
import Alert from '@/components/Alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Signer {
  person_etsi: string;
  reg_no?: string;
  name?: string;
  name_en?: string;
  role?: string;
  right_type: string;
  source: string;
  self: boolean;
}

/**
 * OrgManagePanel нь нэвтэрсэн иргэний төлөөлдөг НЭГ байгууллагын гарын үсэг зурах
 * эрхтэй хүмүүсийг удирдах (жагсаах / РД-гээр нэмэх / хасах) ба тухайн байгууллагаас
 * өөрийгөө салгах (unlink) UI. Гарын үсэг зурагч нэмэх/хасах нь баруун дээд товч →
 * pop-up-аар; зөвхөн ADMIN эрхтэй хэрэглэгчид (eidmongolia талд бас шалгагдана).
 */
export default function OrgManagePanel({
  regNo,
  onUnlinked,
}: {
  regNo: string;
  onUnlinked: () => void;
}) {
  const { T, lang } = useT();
  const qc = useQueryClient();
  const [signerReg, setSignerReg] = useState('');
  const [role, setRole] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const base = `/api/me/eid/organizations/${encodeURIComponent(regNo)}`;
  const signersKey = ['eid-org-signers', regNo];

  const q = useQuery({
    queryKey: signersKey,
    queryFn: () => getJSON<Signer[]>(`${base}/signers`),
  });

  // Зөвхөн ADMIN эрхтэй хэрэглэгч гарын үсэг зурагч нэмж/хасаж чадна.
  const isAdmin = !!q.data?.some((s) => s.self && s.right_type === 'ADMIN');

  const add = useMutation({
    mutationFn: async () => {
      const res = await postJSON<Signer[]>(`${base}/signers`, {
        signer_reg_no: signerReg.trim(),
        role: role.trim(),
      });
      if (!res.ok) throw new Error(res.message || T('me.orgs.signers.add.error'));
      return res.data ?? [];
    },
    onSuccess: (data) => {
      qc.setQueryData(signersKey, data);
      setSignerReg('');
      setRole('');
      setAddOpen(false);
      setOkMsg(T('me.orgs.signers.add.success'));
    },
  });

  const remove = useMutation({
    mutationFn: async (reg: string) => {
      const res = await sendJSON<Signer[]>(`${base}/signers?signer=${encodeURIComponent(reg)}`, 'DELETE');
      if (!res.ok) throw new Error(res.message || T('me.orgs.signers.remove.error'));
      return res.data ?? [];
    },
    onSuccess: (data) => qc.setQueryData(signersKey, data),
  });

  const unlink = useMutation({
    mutationFn: async () => {
      const res = await sendJSON(`${base}`, 'DELETE');
      if (!res.ok) throw new Error(res.message || T('me.orgs.unlink.error'));
      return true;
    },
    onSuccess: () => onUnlinked(),
  });

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (signerReg.trim().length >= 8) add.mutate();
  };

  return (
    <div className="org-manage" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <h3 style={{ fontSize: '0.9rem', margin: 0 }}>{T('me.orgs.signers.title')}</h3>
        {isAdmin && (
          <button type="button" className="btn btn--primary btn--sm" style={{ flex: 'none' }} onClick={() => { setOkMsg(''); add.reset(); setAddOpen(true); }}>
            <UserPlus size={15} strokeWidth={2} />
            <span>{T('me.orgs.signers.add.button')}</span>
          </button>
        )}
      </div>

      {okMsg && <div style={{ marginBottom: 8 }}><Alert kind="success">{okMsg}</Alert></div>}

      {q.isPending ? (
        <p className="muted" style={{ fontSize: 13 }}>{T('me.orgs.signers.loading')}</p>
      ) : q.isError ? (
        <p className="muted" style={{ fontSize: 13 }}>{(q.error as Error).message}</p>
      ) : !q.data || q.data.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>{T('me.orgs.signers.none')}</p>
      ) : (
        <div className="org-signers" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {q.data.map((s) => (
            <div key={s.person_etsi} className="org-signer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span>{(lang === 'en' && s.name_en) ? s.name_en : (s.name || s.reg_no)}</span>
                {s.self && <span className="chip chip--neutral" style={{ marginLeft: 6 }}>{T('me.orgs.signers.you')}</span>}
                <span className="chip chip--neutral" style={{ marginLeft: 6 }}>{s.right_type}</span>
                <div className="muted mono" style={{ fontSize: 12 }}>
                  {s.reg_no}{s.role ? ` · ${s.role}` : ''}
                </div>
              </div>
              {isAdmin && !s.self && s.reg_no && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-label={T('me.orgs.signers.remove.button')}
                  disabled={remove.isPending}
                  onClick={() => { if (window.confirm(T('me.orgs.signers.remove.confirm'))) remove.mutate(s.reg_no as string); }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {remove.isError && <div style={{ marginTop: 6 }}><Alert kind="danger">{(remove.error as Error).message}</Alert></div>}

      {/* Байгууллага салгах — аль ч эрхтэй хэрэглэгч өөрийгөө салгаж болно. */}
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ color: 'var(--danger, #b91c1c)' }}
          disabled={unlink.isPending}
          onClick={() => { if (window.confirm(T('me.orgs.unlink.confirm'))) unlink.mutate(); }}
        >
          <Unlink size={15} strokeWidth={2} />
          <span>{T('me.orgs.unlink.button')}</span>
        </button>
        {unlink.isError && <div style={{ marginTop: 6 }}><Alert kind="danger">{(unlink.error as Error).message}</Alert></div>}
      </div>

      {/* Гарын үсэг зурагч нэмэх — pop-up */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) add.reset(); }}>
        <DialogContent className="dlg-content--narrow">
          <DialogHeader>
            <DialogTitle>{T('me.orgs.signers.add.title')}</DialogTitle>
            <DialogDescription>{T('me.orgs.signers.add.hint')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdd}>
            <label className="org-add__label">{T('me.orgs.signers.add.regno')}</label>
            <input
              className="input mono"
              style={{ marginTop: 6 }}
              autoFocus
              autoComplete="off"
              placeholder={T('me.orgs.signers.add.regno')}
              value={signerReg}
              onChange={(e) => { setSignerReg(e.target.value); if (add.isError) add.reset(); }}
              disabled={add.isPending}
              maxLength={20}
            />
            <label className="org-add__label" style={{ marginTop: 10, display: 'block' }}>{T('me.orgs.signers.add.role')}</label>
            <input
              className="input"
              style={{ marginTop: 6 }}
              placeholder={T('me.orgs.signers.add.role')}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={add.isPending}
              maxLength={100}
            />
            {add.isError && <div style={{ marginTop: 10 }}><Alert kind="danger">{(add.error as Error).message}</Alert></div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn--ghost" onClick={() => setAddOpen(false)} disabled={add.isPending}>{T('common.cancel')}</button>
              <button type="submit" className="btn btn--primary" disabled={add.isPending || signerReg.trim().length < 8}>
                <UserPlus size={16} strokeWidth={2} />
                <span>{add.isPending ? T('me.orgs.signers.add.submitting') : T('me.orgs.signers.add.button')}</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
