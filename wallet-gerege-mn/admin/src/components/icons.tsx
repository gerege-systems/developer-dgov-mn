import React from 'react';

// Хөнгөн inline SVG icon-ууд (гадны хамааралгүй). stroke=currentColor.
type P = { className?: string; style?: React.CSSProperties };
const S = (p: { children: React.ReactNode } & P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}>{p.children}</svg>
);

export const IcoOverview = (p: P) => <S {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>;
export const IcoClients = (p: P) => <S {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.2a3 3 0 0 1 0 5.6" /><path d="M17.5 19a5.5 5.5 0 0 0-2.3-4.4" /></S>;
export const IcoAccounts = (p: P) => <S {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 9.5h19" /><path d="M6.5 14.5h4" /></S>;
export const IcoReports = (p: P) => <S {...p}><path d="M5 3.5h9l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1-1.5Z" /><path d="M14 3.5V9h5" /><path d="M8.5 13v4M12 11.5v5.5M15.5 14.5V17" /></S>;
export const IcoFees = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M15.5 9.5 8.5 16.5M9.5 10.5h.01M14.5 14.5h.01" /></S>;
export const IcoAudit = (p: P) => <S {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z" /><path d="M8 9h8M8 12.5h8M8 16h5" /></S>;
export const IcoLogout = (p: P) => <S {...p}><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" /><path d="M17 8.5 20.5 12 17 15.5M20 12H9.5" /></S>;
export const IcoShield = (p: P) => <S {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6Z" /><path d="m9 12 2 2 4-4" /></S>;
export const IcoCoin = (p: P) => <S {...p}><ellipse cx="12" cy="6.5" rx="7.5" ry="3" /><path d="M4.5 6.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5" /><path d="M4.5 11.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5" /></S>;
export const IcoCheck = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.3 2.3 4.7-4.6" /></S>;
export const IcoWarn = (p: P) => <S {...p}><path d="M12 3.5 21 19H3Z" /><path d="M12 10v4M12 16.5h.01" /></S>;
export const IcoRefresh = (p: P) => <S {...p}><path d="M20 11a8 8 0 0 0-13.4-4.5L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 13.4 4.5L20 15" /><path d="M20 20v-5h-5" /></S>;
export const IcoSearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></S>;
export const IcoSun = (p: P) => <S {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.5M12 19v2.5M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M2.5 12H5M19 12h2.5M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8" /></S>;
export const IcoMoon = (p: P) => <S {...p}><path d="M20 13.5A7.5 7.5 0 0 1 10.5 4a6 6 0 1 0 9.5 9.5Z" /></S>;
export const IcoMenu = (p: P) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>;
export const IcoClose = (p: P) => <S {...p}><path d="m6 6 12 12M18 6 6 18" /></S>;
export const IcoInbox = (p: P) => <S {...p}><path d="M4 13h4l1.5 2.5h5L16 13h4" /><path d="M5 13 7 5h10l2 8v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18v-5Z" /></S>;
export const IcoBook = (p: P) => <S {...p}><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.5A1.5 1.5 0 0 0 5 20Z" /><path d="M5 20a1.5 1.5 0 0 0 1.5 1.5H19" /><path d="M9 7.5h6M9 11h6" /></S>;
export const IcoQR = (p: P) => <S {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 21v.01M17 21h.01M21 14v3" /></S>;
