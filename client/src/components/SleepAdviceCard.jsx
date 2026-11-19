import { useLang } from '../context/LanguageContext';

function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8F8AF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14A8.5 8.5 0 1 1 10 4a7 7 0 0 0 10 10z" />
    </svg>
  );
}

const btn = (primary) => ({
  flex: 1, minHeight: 42, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
  border: primary ? 'none' : '1px solid var(--border)',
  background: primary ? 'linear-gradient(135deg,#36E8C6,#1EC0A2)' : 'transparent',
  color: primary ? '#04241B' : 'var(--text-2)',
});

const linkBtn = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
  fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', textDecoration: 'underline',
};

// What last night's sleep suggests, shown transparently. 'adjust' asks the user
// (approve / skip); 'note' is one quiet line; anything else renders nothing.
// `adaptOff` = the user switched workout suggestions off, so there is no load to ease.
export default function SleepAdviceCard({ advice, choice, onChoose, adaptOff = false, compact = false }) {
  const { lang } = useLang();
  const isHe = lang === 'he';
  if (!advice || advice.level === 'none') return null;
  const text = isHe ? advice.he : advice.en;

  if (advice.level === 'note') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: compact ? 0 : 14, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-3)' }}>
        <span style={{ flex: 'none', marginTop: 2 }}><MoonIcon size={14} /></span>
        <span>{text}</span>
      </div>
    );
  }

  // 'adjust'
  const accepted = choice === 'accepted';
  const skipped = choice === 'skipped';
  return (
    <div
      role="group"
      aria-label={isHe ? 'המלצה לפי השינה' : 'Sleep-based suggestion'}
      style={{
        marginTop: compact ? 0 : 14, padding: compact ? '12px 14px' : '14px 16px', borderRadius: 16,
        background: 'rgba(143,138,247,.08)', border: '1px solid rgba(143,138,247,.28)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <MoonIcon />
        <span style={{ fontSize: 13, fontWeight: 800, color: '#8F8AF7' }}>
          {isHe ? 'המלצה לפי השינה שלך' : 'Based on your sleep'}
        </span>
      </div>

      {!accepted && !skipped && (
        <>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{text}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" style={btn(true)} onClick={() => onChoose('accepted')}>
              {isHe ? 'אשר' : 'Approve'}
            </button>
            <button type="button" style={btn(false)} onClick={() => onChoose('skipped')}>
              {isHe ? 'דלג' : 'Skip'}
            </button>
          </div>
        </>
      )}

      {accepted && (
        <>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
            {adaptOff
              ? (isHe ? 'אושר. הצעות המשקל כבויות בהגדרות, ולכן אין מה להקל. אפשר להתחיל קל יותר לפי התחושה.' : 'Approved. Weight suggestions are switched off in Settings, so there is nothing to lower. Start lighter by feel if you like.')
              : (isHe ? 'אושר. הצעות המשקל באימון יהיו צעד אחד קלות יותר מהרגיל. שום משקל לא משתנה בלי שתלחץ עליו.' : 'Approved. Weight suggestions in your workout will be one step lighter than usual. No weight changes until you tap it.')}
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="button" style={linkBtn} onClick={() => onChoose(null)}>{isHe ? 'בטל' : 'Undo'}</button>
          </div>
        </>
      )}

      {skipped && (
        <>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-3)' }}>
            {isHe ? 'דילגת על ההמלצה. התוכנית נשארת כפי שהיא.' : 'Skipped. Your plan stays as it is.'}
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="button" style={linkBtn} onClick={() => onChoose(null)}>{isHe ? 'חזור להמלצה' : 'Show it again'}</button>
          </div>
        </>
      )}
    </div>
  );
}
