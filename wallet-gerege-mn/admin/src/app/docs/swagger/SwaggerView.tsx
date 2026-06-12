"use client";

import React, { useEffect, useState } from 'react';

const VER = '5.17.14';
const BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VER}`;

// Swagger UI-г CDN-ээс (pinned version) ачаалж, хамгаалалттай /api/openapi proxy-аас
// spec-ийг рендэрнэ. Try-it-out унтраалттай (read-only spec viewer).
export default function SwaggerView() {
  const [err, setErr] = useState('');

  useEffect(() => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${BASE}/swagger-ui.css`;
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = `${BASE}/swagger-ui-bundle.js`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      const w = window as unknown as { SwaggerUIBundle?: (o: unknown) => void };
      if (!w.SwaggerUIBundle) { setErr('Swagger UI ачаалж чадсангүй.'); return; }
      w.SwaggerUIBundle({
        url: '/api/openapi',
        dom_id: '#swagger-ui',
        deepLinking: true,
        supportedSubmitMethods: [], // try-it-out унтраах (read-only)
        defaultModelsExpandDepth: 0,
      });
    };
    script.onerror = () => setErr('Swagger UI-г CDN-ээс ачаалж чадсангүй (интернэт шалгана уу).');
    document.body.appendChild(script);

    return () => { css.remove(); script.remove(); };
  }, []);

  return (
    <>
      {err && <div className="alert alert--err" style={{ margin: 16 }}>{err}</div>}
      <div id="swagger-ui" />
    </>
  );
}
