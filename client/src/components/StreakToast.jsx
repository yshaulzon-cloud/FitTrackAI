import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

// Celebratory toast shown the moment the daily activity streak advances.
// Reuses the .xp-toast visual treatment so it matches the XP notification.
export default function StreakToast({ streak, onDone }) {
  const { lang } = useLang();
  const isHe = lang === 'he';
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!streak) return null;

  // Day 1 is "starting" a streak; day 2+ is "continuing" it.
  const title = streak <= 1
    ? (isHe ? 'התחלת רצף! 🎯' : 'Streak started! 🎯')
    : (isHe ? 'המשכת את הרצף!' : 'Streak continued!');
  const detail = isHe
    ? `${streak} ${streak === 1 ? 'יום' : 'ימים'} ברצף`
    : `${streak}-day streak`;

  return (
    <div className={`xp-toast level-up xp-toast--streak ${visible ? 'show' : 'hide'}`}>
      <div className="xp-toast-content">
        <span className="xp-toast-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c1 3.5 5 5.5 5 9.5a5 5 0 0 1-10 0C7 10 8.5 8.5 9.5 7c.5 1.5 1.3 2.4 2.8 3-.8-2.3-.8-4.7-.3-7z" /></svg>
        </span>
        <div>
          <div className="xp-toast-title">{title}</div>
          <div className="xp-toast-detail">{detail}</div>
        </div>
      </div>
    </div>
  );
}
