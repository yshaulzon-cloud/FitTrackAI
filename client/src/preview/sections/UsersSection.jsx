import { useState } from 'react';
import { Section, Row, Btn } from '../ui.jsx';
import { PERSONAS, PASSWORD } from '../personas.js';
import * as testApi from '../api/testApi.js';

// A3: switch test users, seed/reset their data, and clear app storage — every
// action goes through the real server API + the app's real auth, never a mock.
export default function UsersSection({ bridge }) {
  const { applyToken, clearAppStorage, clearAppCache, reloadTo, send, setFlag, CMD } = bridge;
  const [active, setActive] = useState(null); // persona id
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(null); // label of in-flight action
  const [status, setStatus] = useState('בחר משתמש בדיקה כדי להתחיל.');

  const run = async (label, fn) => {
    setBusy(label);
    setStatus(`${label}…`);
    try {
      const msg = await fn();
      setStatus(msg || `${label} ✓`);
    } catch (e) {
      setStatus(`✗ ${label}: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const switchPersona = (persona) =>
    run(`מתחבר כ${persona.label}`, async () => {
      const { token: tok, created } = await testApi.registerOrLogin(persona.email, PASSWORD);
      // Onboard on first creation, or if a reused account was never finished.
      let onboarded = !created;
      if (!created) {
        const prof = await testApi.getProfile(tok).catch(() => null);
        onboarded = !!prof?.onboardingComplete;
      }
      if (!onboarded) {
        await testApi.onboard(tok, { name: persona.name, ...persona.profile });
      }
      // Seed only for a persona that wants data, and only when freshly created,
      // so repeated switches don't pile up duplicate meals.
      if (persona.seed && created) await testApi.seedDemo(tok);
      // "Day one" personas reuse the same account every run, but the app's
      // first-time-home-screen flag is a one-time localStorage marker — clear
      // it so the intro reliably shows again on every switch to this persona.
      if (persona.resetIntro) setFlag('areto:home-intro-seen', null, { reload: false });

      setToken(tok);
      setActive(persona.id);
      applyToken(tok, '/dashboard');
      return `מחובר כ${persona.label}${created ? ' (חדש)' : ''}`;
    });

  const needToken = (fn) => () => {
    if (!token) { setStatus('קודם בחר משתמש בדיקה.'); return; }
    fn();
  };

  const loadDemo = needToken(() =>
    run('טוען Demo Data', async () => {
      await testApi.seedDemo(token);
      reloadTo('/dashboard');
      return 'Demo Data נטען ✓';
    }));

  const resetData = needToken(() =>
    run('מאפס נתונים', async () => {
      const r = await testApi.resetData(token);
      reloadTo('/dashboard');
      const d = r.deleted || {};
      return `אופס: ${d.workouts || 0} אימונים · ${d.nutrition || 0} ארוחות · ${d.sleep || 0} שינה`;
    }));

  const deletePersona = needToken(() =>
    run('מוחק חשבון', async () => {
      await testApi.deleteUser(token);
      setToken(null); setActive(null);
      clearAppStorage('/onboarding');
      return 'החשבון נמחק ✓';
    }));

  const logout = () =>
    run('מתנתק', async () => {
      send(CMD.LOGOUT);
      setToken(null); setActive(null);
      return 'התנתק ✓';
    });

  const clearStorage = () =>
    run('מנקה storage', async () => {
      clearAppStorage('/onboarding');
      setToken(null); setActive(null);
      return 'localStorage + sessionStorage נוקו ✓';
    });

  const clearCache = () =>
    run('מנקה cache', async () => {
      await clearAppCache();
      return 'Cache נוקה ✓';
    });

  return (
    <Section title="משתמשים ונתונים" hint={active ? `● ${active}` : undefined}>
      <div className="hz-personas">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`hz-persona${active === p.id ? ' hz-persona--on' : ''}`}
            onClick={() => switchPersona(p)}
            disabled={!!busy}
            title={p.hint}
          >
            <span className="hz-persona__label">{p.label}</span>
            <span className="hz-persona__hint">{p.hint}</span>
          </button>
        ))}
      </div>

      <Row>
        <Btn onClick={loadDemo} disabled={!!busy}>Load Demo Data</Btn>
        <Btn onClick={resetData} disabled={!!busy}>Reset Data</Btn>
        <Btn onClick={logout} disabled={!!busy}>Logout</Btn>
      </Row>
      <Row>
        <Btn onClick={clearStorage} disabled={!!busy}>Clear Storage</Btn>
        <Btn onClick={clearCache} disabled={!!busy}>Clear Cache</Btn>
        <Btn tone="danger" onClick={deletePersona} disabled={!!busy}>Delete User</Btn>
      </Row>

      <div className={`hz-status${busy ? ' hz-status--busy' : ''}`}>{status}</div>
    </Section>
  );
}
