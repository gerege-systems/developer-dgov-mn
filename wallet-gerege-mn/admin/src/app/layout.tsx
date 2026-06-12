import React from 'react';
import './globals.css';

export const metadata = { title: 'Gerege Core Banking — Platform Admin' };

// No-flash: paint-ээс өмнө localStorage-оос theme-ийг уншиж data-theme тавина.
const themeScript = `(function(){try{var t=localStorage.getItem('wadmin-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
