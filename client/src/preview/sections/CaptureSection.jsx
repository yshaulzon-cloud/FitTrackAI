import { Section, Row, Btn } from '../ui.jsx';
import { useCapture } from '../useCapture.js';

// A6: still + video capture of the phone frame. One permission prompt on
// "connect", then screenshot/record are one tap each and produce device-only
// output (see useCapture — it crops to the phone rect on a canvas).
export default function CaptureSection() {
  const getPhone = () => document.querySelector('.pf__viewport');
  const { armed, recording, error, arm, disarm, screenshot, startRecording, stopRecording } = useCapture(getPhone);

  return (
    <Section title="לכידה" hint={armed ? '● מחובר' : undefined}>
      {!armed ? (
        <Row>
          <Btn tone="accent" onClick={arm}>חבר לכידה</Btn>
        </Row>
      ) : (
        <>
          <Row>
            <Btn onClick={screenshot}>📷 צילום מסך</Btn>
            {recording ? (
              <Btn tone="danger" onClick={stopRecording}>■ עצור הקלטה</Btn>
            ) : (
              <Btn onClick={startRecording}>● הקלט וידאו</Btn>
            )}
          </Row>
          <Row>
            <Btn onClick={disarm}>נתק לכידה</Btn>
          </Row>
        </>
      )}
      {recording && <div className="hz-rec">מקליט…</div>}
      {error && <div className="hz-status">{error}</div>}
      <p className="hz-soon">הפלט מכיל רק את מסגרת הטלפון · PNG / WEBM</p>
    </Section>
  );
}
