import React from 'react';
import Sidebar from './Sidebar';

export default function Shell({
  title, sub, actions, children,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <div className="head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          {actions && <div className="row" style={{ alignItems: 'center' }}>{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
