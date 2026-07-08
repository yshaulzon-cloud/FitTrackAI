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
        <span className="xp-toast-icon">🔥</span>
        <div>
          <div className="xp-toast-title">{title}</div>
          <div className="xp-toast-detail">{detail}</div>
        </div>
      </div>
    </div>
  );
}
