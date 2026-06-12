"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IcoWarn, IcoShield } from './icons';

export interface ConfirmOpts {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

// useConfirm — гоё баталгаажуулах dialog. confirm(opts) нь Promise<boolean> буцаана;
// `dialog`-ийг компонент дотроо render хийнэ.
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((res) => { resolver.current = res; setOpts(o); }),
    [],
  );
  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts, close]);

  const danger = opts?.variant === 'danger';
  const dialog = opts ? (
    <div className="modal-overlay" onMouseDown={() => close(false)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`modal__icon modal__icon--${danger ? 'danger' : 'primary'}`}>
          {danger ? <IcoWarn /> : <IcoShield />}
        </div>
        <div className="modal__title">{opts.title}</div>
        {opts.message && <p className="modal__msg">{opts.message}</p>}
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => close(false)}>{opts.cancelText ?? 'Болих'}</button>
          <button className={`btn${danger ? ' btn--red' : ''}`} onClick={() => close(true)} autoFocus>
            {opts.confirmText ?? 'Тийм'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
