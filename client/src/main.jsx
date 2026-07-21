import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { LegalProvider } from './context/LegalContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import './index.css';

// Dev preview harness bridge. `import.meta.env.DEV` is a compile-time constant:
// in a production build it folds to `false`, the ternary becomes `null`, and
// the dynamic import() is dead code Rollup drops — so no preview code ships.
// At runtime the bridge additionally mounts only when embedded in the harness
// (see the component), so opening the app directly in dev is unaffected.
const PreviewBridge = import.meta.env.DEV
  ? React.lazy(() => import('./preview/bridge/PreviewBridge.jsx'))
  : null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AccessibilityProvider>
          <LanguageProvider>
            <LegalProvider>
              <AuthProvider>
                <App />
                {PreviewBridge && window.parent !== window && (
                  <React.Suspense fallback={null}>
                    <PreviewBridge />
                  </React.Suspense>
                )}
              </AuthProvider>
            </LegalProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
