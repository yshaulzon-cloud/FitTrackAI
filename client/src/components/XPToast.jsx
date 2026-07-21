import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

export default function XPToast({ xpEvents, onDone }) {
  const { t } = useLang();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!xpEvents || xpEvents.length === 0) return null;

  const hasLevelUp = xpEvents.some(e => e.leveledUp);
  const totalXP = xpEvents.reduce((sum, e) => sum + (e.xpGained || 0), 0);
  const newLevel = xpEvents.find(e => e.leveledUp)?.level;

  return (
    <div className={`xp-toast ${visible ? 'show' : 'hide'} ${hasLevelUp ? 'level-up' : ''}`}>
      {hasLevelUp ? (
        <div className="xp-toast-content">
          <span className="xp-toast-icon">🎉</span>
          <div>
            <div className="xp-toast-title">{t.levelUp}</div>
            <div className="xp-toast-detail">{t.levelUpMsg} {newLevel}!</div>
          </div>
        </div>
      ) : (
        <div className="xp-toast-content">
          <span className="xp-toast-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4l1.7 4.6 4.8 1.7-4.8 1.7L12 16.6l-1.7-4.6-4.8-1.7 4.8-1.7z" /></svg>
          </span>
          <span className="xp-toast-xp">+{totalXP} XP</span>
        </div>
      )}
    </div>
  );
}
