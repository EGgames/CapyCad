import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Prefetch del WASM de OpenCascade (~50MB) en idle time:
// inyecta un <link rel="prefetch"> con la URL resuelta por Vite (con hash en
// producción), de modo que la descarga se solape con el render inicial en
// lugar de empezar recién cuando el worker llame a initOpenCascade().
function prefetchOpenCascadeWasm(): void {
  if (typeof document === 'undefined') return;
  void import('opencascade.js/dist/opencascade.full.wasm?url').then(({ default: url }) => {
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'fetch';
    link.type = 'application/wasm';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.appendChild(link);
  }).catch(() => {
    // Silencioso: si falla no es crítico, el worker lo cargará a demanda.
  });
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};
const w = window as IdleWindow;
if (typeof w.requestIdleCallback === 'function') {
  w.requestIdleCallback(prefetchOpenCascadeWasm, { timeout: 2000 });
} else {
  setTimeout(prefetchOpenCascadeWasm, 500);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
