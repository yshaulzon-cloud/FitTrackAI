import { useState } from 'react';
import PhoneFrame from './PhoneFrame.jsx';
import { Section, Row, Btn, Seg } from './ui.jsx';
import { useHarnessBridge } from './bridge/useHarnessBridge.js';
import UsersSection from './sections/UsersSection.jsx';
import ScreensSection from './sections/ScreensSection.jsx';
import ObserveSection from './sections/ObserveSection.jsx';

// The app's routable screens, for the "open any screen" control. The dashboard
// tabs live behind one route (state, not URL), so deep-tab nav is refined in A4;
// here we cover the top-level routes.
const ROUTES = [
  { path: '/welcome', label: 'Welcome' },
  { path: '/login', label: 'Login' },
  { path: '/onboarding', label: 'Onboarding' },
  { path: '/dashboard', label: 'Dashboard' },
];

const START = '/dashboard';

export default function PreviewApp() {
  const bridge = useHarnessBridge();
  const { iframeRef, connected, route, send, onIframeLoad, CMD } = bridge;

  // Harness-local UI state (mirrors what we last told the app).
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('he');
  const [initialSrc] = useState(START);

  const go = (path) => send(CMD.NAVIGATE, { path });
  const setAppTheme = (t) => { setTheme(t); send(CMD.SET_THEME, { theme: t }); };
  const setAppLang = (l) => { setLang(l); send(CMD.SET_LANG, { lang: l }); };

  return (
    <div className="hz">
      <aside className="hz-side">
        <div className="hz-brand">
          <span className="hz-brand__mark">A</span>
          <div>
            <div className="hz-brand__name">Areto Preview</div>
            <div className="hz-brand__sub">local harness · dev only</div>
          </div>
          <span
            className={`hz-conn${connected ? ' hz-conn--on' : ''}`}
            title={connected ? 'bridge connected' : 'connecting…'}
          />
        </div>

        <div className="hz-scroll">
          <Section title="ניווט" hint={route || '—'}>
            <Row>
              {ROUTES.map((r) => (
                <Btn
                  key={r.path}
                  tone={route === r.path ? 'accent' : 'default'}
                  onClick={() => go(r.path)}
                >
                  {r.label}
                </Btn>
              ))}
            </Row>
          </Section>

          <Section title="תצוגה">
            <div className="hz-field">
              <span className="hz-field__label">Theme</span>
              <Seg
                value={theme}
                onChange={setAppTheme}
                options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
              />
            </div>
            <div className="hz-field">
              <span className="hz-field__label">Language</span>
              <Seg
                value={lang}
                onChange={setAppLang}
                options={[{ value: 'he', label: 'עברית' }, { value: 'en', label: 'English' }]}
              />
            </div>
          </Section>

          <UsersSection bridge={bridge} />
          <ScreensSection bridge={bridge} />
          <ObserveSection bridge={bridge} />

          {/* Stubs — each names the stage that fills it, so the shell reads as
              a plan, not as broken buttons. */}
          <Section title="לכידה" hint="A6">
            <p className="hz-soon">צילום מסך · הקלטת וידאו</p>
          </Section>
          <Section title="הזרקת נתונים" hint="A7">
            <p className="hz-soon">Stub של תגובות API למצבי קצה</p>
          </Section>
        </div>

        <div className="hz-foot">Vite HMR · שינוי בקוד האפליקציה מתעדכן חי</div>
      </aside>

      <main className="hz-stage">
        <PhoneFrame>
          <iframe
            ref={iframeRef}
            title="Areto app"
            className="hz-screen"
            src={initialSrc}
            onLoad={onIframeLoad}
          />
        </PhoneFrame>
      </main>
    </div>
  );
}
