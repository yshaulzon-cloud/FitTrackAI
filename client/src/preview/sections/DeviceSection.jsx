import { useEffect, useState } from 'react';
import { Section, Row, Btn } from '../ui.jsx';
import { deviceInfo, launch, key } from '../device.js';

// B: real-device mode. Toggles the phone frame between the web app (iframe) and
// a live mirror of the physical phone (DeviceView), and offers ADB-level
// controls. Input keys need the device to permit injection; on MIUI/Android 16
// that's a second developer toggle, surfaced here when a control is blocked.
export default function DeviceSection({ mode, setMode, onDeviceSize }) {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('בדיקת חיבור…');

  const probe = async () => {
    try {
      const d = await deviceInfo();
      setInfo(d);
      onDeviceSize?.(d.size);
      setStatus(d.serial ? `${d.model} · ${d.size?.w}×${d.size?.h}` : 'אין מכשיר מחובר');
    } catch {
      setInfo(null);
      setStatus('הגשר לא רץ — הפעל: npm run device-bridge');
    }
  };
  useEffect(() => { probe(); }, []);

  const doKey = async (k) => {
    try { await key(k); }
    catch (e) {
      setStatus(/INJECT_EVENTS|SecurityException/.test(e.message)
        ? 'הקשות חסומות — הפעל "USB debugging (Security settings)" באפשרויות מפתחים'
        : `שגיאה: ${e.message}`);
    }
  };

  return (
    <Section title="מצב מכשיר" hint={info?.serial ? '● מחובר' : undefined}>
      <Row>
        <Btn tone={mode === 'web' ? 'accent' : 'default'} onClick={() => setMode('web')}>אפליקציית web</Btn>
        <Btn tone={mode === 'device' ? 'accent' : 'default'} onClick={() => setMode('device')}>מכשיר אמיתי</Btn>
      </Row>

      <div className="hz-status">{status}</div>

      {mode === 'device' && (
        <>
          <Row>
            <Btn onClick={() => launch().catch(() => {})}>הפעל Areto</Btn>
            <Btn onClick={probe}>רענן חיבור</Btn>
          </Row>
          <Row>
            <Btn onClick={() => doKey('back')}>◁ Back</Btn>
            <Btn onClick={() => doKey('home')}>○ Home</Btn>
            <Btn onClick={() => doKey('recents')}>▢ Recents</Btn>
          </Row>
          <p className="hz-soon">לחיצה על המסך = הקשה אמיתית על הטלפון. וידאו חלק יותר: הרץ <code>scrcpy</code> בטרמינל.</p>
        </>
      )}
    </Section>
  );
}
