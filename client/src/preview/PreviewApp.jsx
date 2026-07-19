import { useRef, useState } from 'react';
import PhoneFrame from './PhoneFrame.jsx';

// A1: layout only — sidebar shell (filled in A2+) on one side, a device-framed
// iframe of the REAL app on the other. The iframe src is the app's own entry
// (index.html), so what renders is exactly the code that ships in the APK.
export default function PreviewApp() {
  const iframeRef = useRef(null);
  const [route, setRoute] = useState('/dashboard');

  // Reload the embedded app at a given route. Real navigation lands in A4 via
  // the command bridge; this is the coarse "hard reload to a path" fallback.
  const openRoute = (path) => {
    setRoute(path);
    const f = iframeRef.current;
    if (f) f.src = path;
  };

  return (
    <div className="hz">
      <aside className="hz-side">
        <div className="hz-brand">
          <span className="hz-brand__mark">A</span>
          <div>
            <div className="hz-brand__name">Areto Preview</div>
            <div className="hz-brand__sub">local harness · dev only</div>
          </div>
        </div>

        {/* A2+ fill this with the real control sections. For A1 it's a stub so
            the layout and the live app are verifiable on their own. */}
        <div className="hz-placeholder">
          <p>הפקדים ייטענו בשלב A2.</p>
          <div className="hz-route-quick">
            {['/welcome', '/login', '/onboarding', '/dashboard'].map((p) => (
              <button
                key={p}
                type="button"
                className={`hz-chip${route === p ? ' hz-chip--on' : ''}`}
                onClick={() => openRoute(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="hz-foot">
          Vite HMR · שינוי בקוד האפליקציה מתעדכן חי
        </div>
      </aside>

      <main className="hz-stage">
        <PhoneFrame>
          <iframe
            ref={iframeRef}
            title="Areto app"
            className="hz-screen"
            src={route}
          />
        </PhoneFrame>
      </main>
    </div>
  );
}
