import React from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Нэвтрэх — Gerege Core Banking' };

export default function LoginPage() {
  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <div className="login__logo">₮</div>
          <div>
            <div className="login__title">Gerege Core Banking</div>
            <div className="login__sub">Platform · Удирдлагын самбар</div>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
