"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import Alert from '@/components/Alert';
import PasswordField from '@/components/PasswordField';
import { postJSON } from '@/lib/client';

export default function RegisterForm() {
  const router = useRouter();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastNameEn, setLastNameEn] = useState('');
  const [firstNameEn, setFirstNameEn] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});

    const res = await postJSON('/api/auth/register', {
      last_name: lastName, first_name: firstName,
      last_name_en: lastNameEn, first_name_en: firstNameEn,
      username, email, password,
    });

    if (res.ok) {
      // Бүртгэл идэвхгүй үүссэн — баталгаажуулалт руу шилжиж кодыг автоматаар илгээнэ.
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&autosend=1`);
      return;
    }
    setBusy(false);
    if (res.status === 422 && res.fieldErrors) {
      setFieldErrors(res.fieldErrors);
      return;
    }
    // 409 = username/email давхцал.
    setError(res.message ?? 'Бүртгэл амжилтгүй боллоо.');
  };

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      {error && <Alert kind="danger">{error}</Alert>}

      <div className="field">
        <label className="field__label" htmlFor="last_name">Овог</label>
        <input
          id="last_name"
          name="last_name"
          type="text"
          className="input"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
          placeholder="Цэнддорж"
          maxLength={50}
          aria-invalid={fieldErrors.last_name ? true : undefined}
          required
        />
        {fieldErrors.last_name && <span className="field__error">{fieldErrors.last_name}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="first_name">Нэр</label>
        <input
          id="first_name"
          name="first_name"
          type="text"
          className="input"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          placeholder="Эрдэнэбат"
          maxLength={50}
          aria-invalid={fieldErrors.first_name ? true : undefined}
          required
        />
        {fieldErrors.first_name && <span className="field__error">{fieldErrors.first_name}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="last_name_en">Овог (англиар)</label>
        <input
          id="last_name_en"
          name="last_name_en"
          type="text"
          className="input"
          value={lastNameEn}
          onChange={(e) => setLastNameEn(e.target.value)}
          autoComplete="off"
          placeholder="Tsenddorj"
          maxLength={50}
          aria-invalid={fieldErrors.last_name_en ? true : undefined}
        />
        {fieldErrors.last_name_en
          ? <span className="field__error">{fieldErrors.last_name_en}</span>
          : <span className="field__help">Заавал биш — хэл солиход англиар харагдана.</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="first_name_en">Нэр (англиар)</label>
        <input
          id="first_name_en"
          name="first_name_en"
          type="text"
          className="input"
          value={firstNameEn}
          onChange={(e) => setFirstNameEn(e.target.value)}
          autoComplete="off"
          placeholder="Erdenebat"
          maxLength={50}
          aria-invalid={fieldErrors.first_name_en ? true : undefined}
        />
        {fieldErrors.first_name_en && <span className="field__error">{fieldErrors.first_name_en}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="username">Нэвтрэх нэр</label>
        <input
          id="username"
          name="username"
          type="text"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="johndoe"
          minLength={3}
          maxLength={25}
          aria-invalid={fieldErrors.username ? true : undefined}
          required
        />
        {fieldErrors.username
          ? <span className="field__error">{fieldErrors.username}</span>
          : <span className="field__help">3–25 тэмдэгт.</span>}
      </div>

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
          maxLength={50}
          aria-invalid={fieldErrors.email ? true : undefined}
          required
        />
        {fieldErrors.email
          ? <span className="field__error">{fieldErrors.email}</span>
          : <span className="field__help">Баталгаажуулах кодыг энэ хаягаар илгээнэ.</span>}
      </div>

      <PasswordField
        label="Нууц үг"
        value={password}
        onChange={setPassword}
        showStrength
        autoComplete="new-password"
        error={fieldErrors.password}
        placeholder="Хүчтэй нууц үг"
      />

      <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy}>
        <UserPlus size={18} strokeWidth={2} />
        <span>{busy ? 'Бүртгэж байна…' : 'Бүртгүүлэх'}</span>
      </button>

      <p className="signin-card__alt">
        Бүртгэлтэй юу? <Link href="/login">Нэвтрэх</Link>
      </p>
    </form>
  );
}
