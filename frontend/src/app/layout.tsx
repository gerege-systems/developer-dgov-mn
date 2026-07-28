import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@gerege/ui-core/lib/lang';
import Providers from '@gerege/ui-core/components/Providers';
import { fetchActiveTheme } from '@gerege/ui-core/lib/api';
import { brand } from '@/brand.config';
import { UiCoreProvider } from '@gerege/ui-core';

// Фонтыг build үед татаж next/font өөрөө host хийдэг тул CSP-г чанд 'self'-ээр
// үлдээж болно (гадны фонт host хэрэггүй).
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-stack',
  display: 'swap',
});

const interBody = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-stack',
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-stack',
  display: 'swap',
});

// Сонголттой serif гэр бүл — html[data-font="serif"] үед --font-serif-stack-аар
// display/body-д тэжээгдэнэ. next/font build-time host хийдэг тул CSP 'self' хэвээр.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif-stack',
  display: 'swap',
});

export const metadata: Metadata = {
  title: brand.name,
  description: `eID based, AI enabled. ${brand.name} — ${brand.description}.`,
  // PWA — manifest.ts дахь name/short_name-тэй тааруулав.
  applicationName: brand.name,
  // iOS Safari-д "Нүүр дэлгэцэд нэмэх" үед standalone горимоор нээгдэнэ
  // (apple-mobile-web-app-capable + status bar + дүрсний доорх нэр).
  appleWebApp: {
    capable: true,
    title: brand.short,
    statusBarStyle: 'default',
  },
  other: {
    // Next 15 нь appleWebApp.capable-аас зөвхөн стандарт `mobile-web-app-capable`-г
    // гаргадаг. iOS 16.4-өөс өмнөх Safari нь apple- угтвартайг л ойлгодог тул
    // standalone горим тэнд ажиллахын тулд гараар нэмнэ.
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [{ url: '/brand.webp', type: 'image/webp' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

// viewport / theme-color нь Next-ийн viewport export-оор гарна (<head>-д гараар
// бичихгүй — давхардана). theme_color нь manifest.ts-тэй ижил брэнд токен.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: brand.themeColor,
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Админы сайт-харагдацыг client рүү дамжуулна. Үүнийг ЗӨВХӨН нийтийн хуудсанд
  // (landing/login) хэрэглэнэ — хэрэглэх/эс хэрэглэхийг theme-bootstrap.js зам
  // (pathname) харгалзан шийднэ. SSR-д <html>-д bake хийхгүй: нэвтэрсэн апп-д
  // админ утга анивчихаас сэргийлнэ; блоклогч bootstrap FOUC-ийг хамгаална.
  // Утгууд backend-д баталгаажсан (preset/hex/enum) тул аюулгүй; '<'-г escape
  // хийж </script> тасалдлаас сэргийлнэ.
  const theme = await fetchActiveTheme();
  const appearance = theme.appearance ?? {};
  const siteJson = JSON.stringify(appearance).replace(/</g, '\\u003c');

  return (
    <html
      lang="mn"
      className={`${inter.variable} ${interBody.variable} ${jbMono.variable} ${sourceSerif.variable}`}
      // theme-bootstrap.js нь hydration-аас өмнө <html>-д data-* тавьдаг тул
      // server/client attribute зөрүүгийн warning-ийг дарна.
      suppressHydrationWarning
    >
      <head>
        {/* viewport / color-scheme / icon / manifest толгойг Next.js
            metadata + viewport export болон app/manifest.ts үүсгэнэ. */}
        {/* Идэвхтэй landing theme-ийн харагдац (зөвхөн нийтийн хуудсанд bootstrap хэрэглэнэ). */}
        <script dangerouslySetInnerHTML={{ __html: `window.__SITE_THEME__=${siteJson};` }} />
        {/* FOUC-аас сэргийлэх — гадаад блоклогч script (public/theme-bootstrap.js).
            Статик, адил-origin, 0.5KB файл тул XSS / гуравдагч талын эрсдэлгүй;
            body зурахаас ӨМНӨ ажиллах ёстой тул async/defer хийхгүй (эс бөгөөс
            загвар анивчина). Иймд no-sync-scripts дүрмийг энд зориуд унтраав. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-bootstrap.js" />
      </head>
      <body><UiCoreProvider brandName={brand.name}><Providers><LangProvider>{children}</LangProvider></Providers></UiCoreProvider></body>
    </html>
  );
}
