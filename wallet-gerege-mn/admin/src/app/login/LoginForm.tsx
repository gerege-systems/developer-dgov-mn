"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BP } from '@/lib/basepath';

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch(`${BP}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok && data?.ok) {
      router.push('/');
      router.refresh();
      return;
    }
    setErr(data?.message ?? 'Нэвтрэх амжилтгүй');
  };

  return (
    <form onSubmit={submit}>
      {err && <div className="alert alert--err">{err}</div>}
      <div className="field">
        <label>Хэрэглэгчийн нэр</label>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Нууц үг</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
        {busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
      </button>
    </form>
  );
}
