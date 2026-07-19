// Preview harness entry — DEV ONLY.
//
// This file (and everything under src/preview/) is loaded exclusively by
// preview.html, which vite build never bundles. It is never imported by the
// real app entry (src/main.jsx), so it cannot leak into the production build.
//
// The harness does NOT reimplement the app. It embeds the real app in an
// iframe (same origin, so postMessage + console/network taps work) and drives
// it through a small command bridge. All app logic stays in the app.
import React from 'react';
import ReactDOM from 'react-dom/client';
import PreviewApp from './PreviewApp.jsx';
import './preview.css';

// Guard: refuse to run if this somehow ends up in a production build.
if (import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.error('[harness] preview harness must not run in a production build');
} else {
  ReactDOM.createRoot(document.getElementById('harness-root')).render(
    <React.StrictMode>
      <PreviewApp />
    </React.StrictMode>,
  );
}
