import { useEffect, useState } from 'react';
import { Section, Row, Btn, Seg } from '../ui.jsx';
import { SCREEN_GROUPS, FLAGS, TEXT_SIZE, FORCE_BODY_BANNER } from '../screens.js';

// A4: jump to any screen by operating the real app, and toggle real feature
// flags. Both act on the live app — screens via DOM operation, flags via the
// app's own localStorage keys.
export default function ScreensSection({ bridge }) {
  const { openScreen, getFlag, setFlag, route } = bridge;
  const [flags, setFlags] = useState({});
  const [textSize, setTextSize] = useState('normal');

  // Reflect the app's current flag values when the route/app changes.
  const refresh = () => {
    const next = {};
    for (const f of FLAGS) next[f.key] = getFlag(f.key) === f.on;
    setFlags(next);
    setTextSize(getFlag(TEXT_SIZE.key) || 'normal');
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [route]);

  const toggleFlag = (f) => {
    const nextOn = !flags[f.key];
    setFlag(f.key, nextOn ? f.on : f.off);
    setFlags((s) => ({ ...s, [f.key]: nextOn }));
  };

  return (
    <>
      <Section title="מסכים" hint={route === '/dashboard' ? undefined : 'צריך משתמש מחובר'}>
        {SCREEN_GROUPS.map((g) => (
          <div key={g.group} className="hz-screengroup">
            <span className="hz-screengroup__label">{g.group}</span>
            <Row>
              {g.items.map((s) => (
                <Btn key={s.id} onClick={() => openScreen(s.steps)}>{s.label}</Btn>
              ))}
            </Row>
          </div>
        ))}
      </Section>

      <Section title="Feature Flags">
        {FLAGS.map((f) => (
          <div key={f.key} className="hz-field">
            <span className="hz-field__label">{f.label}</span>
            <button
              type="button"
              className={`hz-toggle${flags[f.key] ? ' hz-toggle--on' : ''}`}
              onClick={() => toggleFlag(f)}
              aria-pressed={!!flags[f.key]}
            >
              <span className="hz-toggle__knob" />
            </button>
          </div>
        ))}
        <div className="hz-field">
          <span className="hz-field__label">גודל טקסט</span>
          <Seg
            value={textSize}
            onChange={(v) => { setTextSize(v); setFlag(TEXT_SIZE.key, v); }}
            options={TEXT_SIZE.options.map((o) => ({ value: o, label: o }))}
          />
        </div>
        <Row>
          <Btn onClick={() => setFlag(FORCE_BODY_BANNER.key, FORCE_BODY_BANNER.value())}>
            אלץ באנר עדכון גוף
          </Btn>
        </Row>
      </Section>
    </>
  );
}
