import { useState } from 'react';
import { Section, Row, Btn } from '../ui.jsx';
import { STUB_PRESETS } from '../stubs.js';

// A7: toggle fake API responses. Enabled presets are pushed to the fetch tap
// (host-side), which short-circuits matching requests — the app renders the
// stubbed state and the server is never hit. Nothing in the app changes.
export default function InjectSection({ bridge }) {
  const { setStubs, reload } = bridge;
  const [on, setOn] = useState({}); // id -> bool

  const apply = (next) => {
    setOn(next);
    setStubs(STUB_PRESETS.filter((p) => next[p.id]).map((p) => ({ ...p, enabled: true })));
  };

  const toggle = (id) => {
    apply({ ...on, [id]: !on[id] });
    // Reload so the app re-fetches through the now-stubbed endpoint.
    setTimeout(reload, 60);
  };

  const clearAll = () => { apply({}); setTimeout(reload, 60); };

  const anyOn = Object.values(on).some(Boolean);

  return (
    <Section title="הזרקת נתונים" hint={anyOn ? '● פעיל' : undefined}>
      <div className="hz-personas">
        {STUB_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`hz-persona${on[p.id] ? ' hz-persona--on' : ''}`}
            onClick={() => toggle(p.id)}
          >
            <span className="hz-persona__label">{p.label}</span>
            <span className="hz-persona__hint">{p.match.method} {p.match.url} → {p.status}</span>
          </button>
        ))}
      </div>
      {anyOn && <Row><Btn tone="danger" onClick={clearAll}>נקה הכל</Btn></Row>}
      <p className="hz-soon">stub של תגובות API למצבי ריק / קיצון / שגיאה — בלי לגעת בשרת או בקוד.</p>
    </Section>
  );
}
