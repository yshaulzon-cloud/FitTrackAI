import { useNavigate, Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { requestNotificationPermission } from '../lib/notifications';

const INTRO_FLAG = 'areto:intro-seen';

function FeatureRow({ icon, title, desc }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        flexShrink: 0,
        width: 34,
        height: 34,
        borderRadius: 10,
        background: 'rgba(45, 212, 191, 0.12)',
        border: '1px solid rgba(45, 212, 191, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-1)',
          marginBottom: 1,
          lineHeight: 1.25,
        }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function Welcome() {
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const navigate = useNavigate();

  const features = isHe
    ? [
        { icon: '🥗', title: 'מעקב תזונה חכם', desc: 'יעדי קלוריות ומאקרו מותאמים אליך, יומן ארוחות פשוט.' },
        { icon: '🏋️', title: 'תוכנית אימונים אישית', desc: 'מבוססת על הניסיון, המטרה ומספר האימונים בשבוע.' },
        { icon: '📈', title: 'התקדמות בזמן אמת', desc: 'גרפים יומיים ושבועיים, מעקב משקל, שינה ורצף הרגלים.' },
      ]
    : [
        { icon: '🥗', title: 'Smart nutrition tracking', desc: 'Personalized calorie and macro targets, a simple meal log.' },
        { icon: '🏋️', title: 'Personalized training plan', desc: 'Built around your experience, goal, and weekly frequency.' },
        { icon: '📈', title: 'Real-time progress', desc: 'Daily and weekly charts. Track weight, sleep, and your streak.' },
      ];

  async function handleNext() {
    try { localStorage.setItem(INTRO_FLAG, '1'); } catch {}
    // Trigger the native notification permission prompt early so streak +
    // workout reminders work the first day; safe no-op on web.
    requestNotificationPermission().catch(() => {});
    navigate('/register');
  }

  return (
    <div className="welcome-screen" style={{
      height: '100dvh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'linear-gradient(155deg, #131a2c 0%, #0a0e1a 55%, #1a1438 100%)',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      textAlign: isHe ? 'right' : 'left',
      direction: isHe ? 'rtl' : 'ltr',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px 14px',
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        minHeight: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <img
            src="/logo.png"
            alt={t.appName}
            width="56"
            height="56"
            style={{ filter: 'drop-shadow(0 8px 28px rgba(45, 212, 191, 0.3))' }}
          />
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
          }}>{t.appName}</div>
          <div style={{
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: isHe ? '0.04em' : '0.18em',
            fontWeight: 600,
            textTransform: isHe ? 'none' : 'uppercase',
          }}>
            {isHe ? 'תזונה · אימונים · תוצאות' : 'Nutrition · Training · Results'}
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--text-1)',
          margin: '0 0 4px',
          textAlign: 'center',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          {isHe ? 'ברוכים הבאים' : 'Welcome'}
        </h1>
        <p style={{
          fontSize: 12.5,
          color: 'var(--text-3)',
          textAlign: 'center',
          margin: '0 0 12px',
          lineHeight: 1.4,
        }}>
          {isHe
            ? 'מעקב פשוט אחרי אימונים, תזונה והתקדמות — הכל במקום אחד.'
            : 'Simple tracking for workouts, nutrition, and progress — all in one place.'}
        </p>

        {/* Features */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '2px 16px',
          marginBottom: 12,
        }}>
          {features.map((f, i) => (
            <FeatureRow key={i} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0 }} />

        {/* CTA */}
        <button
          type="button"
          className="btn-primary-cta"
          onClick={handleNext}
          style={{ marginTop: 4, flexShrink: 0 }}
        >
          <span>{isHe ? 'הבא' : 'Next'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: isHe ? 'none' : 'scaleX(-1)' }}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
          {isHe ? 'כבר יש לך חשבון? ' : 'Already have an account? '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {isHe ? 'התחבר' : 'Log in'}
          </Link>
        </div>
      </div>
    </div>
  );
}
