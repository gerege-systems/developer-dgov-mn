"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import Alert from '@/components/Alert';
import PasswordField from '@/components/PasswordField';
import { postJSON } from '@/lib/client';

export default function ResetPasswordForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
    const res = await postJSON('/api/auth/reset-password', { email, code, new_password: password });
    setBusy(false);
    if (res.ok) {
      router.push('/login?notice=reset');
      return;
    }
    if (res.status === 422 && res.fieldErrors) {
      setFieldErrors(res.fieldErrors);
      return;
    }
    setError(res.message ?? 'Нууц үг шинэчилж чадсангүй. Код буруу эсвэл хугацаа нь дууссан байж магадгүй.');
  };

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      {error && <Alert kind="danger">{error}</Alert>}

      <div className="field">
        <label className="field__label" htmlFor="email">И-мэйл</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tani@gerege.mn"
          aria-invalid={fieldErrors.email ? true : undefined}
          required
        />
        {fieldErrors.email && <span className="field__error">{fieldErrors.email}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="code">Сэргээх код</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="input mono"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="И-мэйлээр ирсэн 6 оронтой код"
          aria-invalid={fieldErrors.code ? true : undefined}
          required
        />
        {fieldErrors.code && <span className="field__error">{fieldErrors.code}</span>}
      </div>

      <PasswordField
        label="Шинэ нууц үг"
        value={password}
        onChange={setPassword}
        showStrength
        autoComplete="new-password"
        error={fieldErrors.new_password}
        placeholder="Шинэ хүчтэй нууц үг"
      />

      <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy || !email || !code}>
        <KeyRound size={18} strokeWidth={2} />
        <span>{busy ? 'Шинэчилж байна…' : 'Нууц үг шинэчлэх'}</span>
      </button>

      <p className="signin-card__alt">
        <Link href="/forgot-password">Код дахин авах</Link>
        {' · '}
        <Link href="/login">Нэвтрэх</Link>
      </p>
    </form>
  );
}
