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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AccessibilityProvider>
          <LanguageProvider>
            <LegalProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </LegalProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
