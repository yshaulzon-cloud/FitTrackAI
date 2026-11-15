import { useEffect, useRef, useState } from 'react';
import { Section } from '../ui.jsx';
import { EVT } from '../bridge/protocol.js';

const CAP = 200; // keep the last N of each stream

// A5: live Logs / Network / Crash streams tapped from the embedded app. Read
// only — the taps live host-side (see useHarnessBridge.installTaps), so the app
// carries no observability code.
export default function ObserveSection({ bridge }) {
  const { on } = bridge;
  const [tab, setTab] = useState('log');
  const [logs, setLogs] = useState([]);
  const [net, setNet] = useState([]);
  const [crash, setCrash] = useState([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    const push = (setter) => (item) =>
      setter((prev) => [...prev.slice(-(CAP - 1)), { ...item, id: `${item.ts}-${Math.random()}` }]);
    const offs = [
      on(EVT.LOG, push(setLogs)),
      on(EVT.NET, push(setNet)),
      on(EVT.CRASH, push(setCrash)),
    ];
    return () => offs.forEach((f) => f && f());
  }, [on]);

  // Keep the newest row in view as things stream in.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, net, crash, tab]);

  const tabs = [
    { id: 'log', label: 'Logs', n: logs.length },
    { id: 'net', label: 'Network', n: net.length },
    { id: 'crash', label: 'Crashes', n: crash.length },
  ];

  const clear = () => { setLogs([]); setNet([]); setCrash([]); };

  return (
    <Section title="תצפית">
      <div className="hz-obs-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hz-obs-tab${tab === t.id ? ' hz-obs-tab--on' : ''}${t.id === 'crash' && t.n ? ' hz-obs-tab--alert' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}<span className="hz-obs-tab__n">{t.n}</span>
          </button>
        ))}
        <button type="button" className="hz-obs-clear" onClick={clear} title="clear">✕</button>
      </div>

      <div className="hz-obs-body" ref={bodyRef}>
        {tab === 'log' && logs.map((l) => (
          <div key={l.id} className={`hz-logline hz-logline--${l.level}`}>
            <span className="hz-logline__lvl">{l.level}</span>
            <span className="hz-logline__txt">{l.text}</span>
          </div>
        ))}
        {tab === 'net' && net.map((r) => (
          <div key={r.id} className={`hz-netline${r.ok ? '' : ' hz-netline--bad'}`}>
            <span className={`hz-netline__status s${Math.floor((r.status || 0) / 100)}`}>{r.status || 'ERR'}</span>
            <span className="hz-netline__method">{r.method}</span>
            <span className="hz-netline__url">{shortUrl(r.url)}</span>
            <span className="hz-netline__ms">{r.ms}ms</span>
          </div>
        ))}
        {tab === 'crash' && crash.map((c) => (
          <div key={c.id} className="hz-crashline">
            <div className="hz-crashline__msg">⚠ {c.message}</div>
            {c.stack && <pre className="hz-crashline__stack">{c.stack.split('\n').slice(0, 4).join('\n')}</pre>}
          </div>
        ))}
        {isEmpty(tab, logs, net, crash) && <div className="hz-obs-empty">אין רשומות עדיין — הפעל את האפליקציה.</div>}
      </div>
    </Section>
  );
}

function isEmpty(tab, logs, net, crash) {
  return (tab === 'log' && !logs.length) || (tab === 'net' && !net.length) || (tab === 'crash' && !crash.length);
}

function shortUrl(u) {
  if (!u) return '';
  try { const p = new URL(u, window.location.origin); return p.pathname + p.search; }
  catch { return u; }
}
