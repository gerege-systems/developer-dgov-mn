import React from 'react';

const fmt = (n: number) => new Intl.NumberFormat('mn-MN').format(n);

// ---- TurnoverBars: өдөр тутмын кредит (орлого) / дебит (зарлага) баганан график ----
export interface Bar { label: string; credit: number; debit: number }

export function TurnoverBars({ data }: { data: Bar[] }) {
  const W = 720;
  const H = 180;
  const padT = 12;
  const padB = 24;
  const padL = 6;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => Math.max(d.credit, d.debit)));
  const plotH = H - padT - padB;
  const groupW = (W - padL * 2) / Math.max(n, 1);
  const bw = Math.min(11, groupW * 0.32);
  const y = (v: number) => padT + plotH * (1 - v / max);
  const step = Math.max(1, Math.ceil(n / 7));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      {[0, 0.5, 1].map((g) => (
        <line key={g} className="grid-line" x1={padL} x2={W - padL} y1={padT + plotH * g} y2={padT + plotH * g} />
      ))}
      {data.map((d, i) => {
        const cx = padL + groupW * i + groupW / 2;
        return (
          <g key={i}>
            <rect x={cx - bw - 1.5} y={y(d.credit)} width={bw} height={padT + plotH - y(d.credit)} rx="2.5" fill="#10b981">
              <title>{`${d.label} · орлого ${fmt(d.credit)}₮`}</title>
            </rect>
            <rect x={cx + 1.5} y={y(d.debit)} width={bw} height={padT + plotH - y(d.debit)} rx="2.5" fill="#f43f5e">
              <title>{`${d.label} · зарлага ${fmt(d.debit)}₮`}</title>
            </rect>
            {i % step === 0 && (
              <text x={cx} y={H - 8} textAnchor="middle">{d.label.slice(5)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---- StatusDonut: дансны төлвийн хуваарилалт (donut + legend) ----
export interface Seg { label: string; value: number; color: string }

export function StatusDonut({ segments, centerSub }: { segments: Seg[]; centerSub?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 54;
  const sw = 18;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width="138" height="138" viewBox="0 0 138 138">
        <g transform="rotate(-90 69 69)">
          <circle cx="69" cy="69" r={r} fill="none" stroke="var(--surface-3)" strokeWidth={sw} />
          {total > 0 && segments.map((s, i) => {
            const len = (s.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle key={i} cx="69" cy="69" r={r} fill="none" stroke={s.color} strokeWidth={sw}
                strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt" />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="69" y="66" textAnchor="middle" className="donut-center">{total}</text>
        <text x="69" y="82" textAnchor="middle" className="donut-center donut-center--sub">{centerSub ?? 'нийт'}</text>
      </svg>
      <div className="legend" style={{ flex: 1 }}>
        {segments.map((s, i) => (
          <div className="legend__row" key={i}>
            <span className="legend__dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="legend__val tnum">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
