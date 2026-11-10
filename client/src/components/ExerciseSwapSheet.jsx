import { useState } from 'react';
import { getAlternatives, findExercise, normalizeUserEquipment, EQUIPMENT_LABELS, DIFFICULTY_LABELS } from '../lib/exerciseLibrary.mjs';
import { getExerciseVideo } from '../lib/exerciseVideos.mjs';

// Bottom sheet: pick a replacement for one exercise. Up to 6 alternatives of the
// same muscle group, ranked by similarity and filtered to the user's equipment;
// the easier version of a hard exercise comes first. Used by the workout plan
// (before starting) and by the live session.
//
// onPick(alternative, { permanent }) — `permanent` is only ever true when
// allowPermanent is set and the user ticked "also in my weekly plan".
export default function ExerciseSwapSheet({ exerciseName, inSession = [], equipment, allowPermanent = false, isHe, onPick, onClose }) {
  const [permanent, setPermanent] = useState(false);
  const alternatives = getAlternatives(exerciseName, { userEquipment: normalizeUserEquipment(equipment), inSession });
  const current = findExercise(exerciseName);
  const base = import.meta.env.BASE_URL;
  const label = (n) => (isHe ? n.replace(/\s*\(.*\)\s*$/, '') : (n.match(/\(([^)]+)\)/) || [, n])[1]);

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="sw-sheet" role="dialog" aria-modal="true" aria-label={isHe ? 'החלפת תרגיל' : 'Swap exercise'}>
        <div className="sw-sheet__grab" aria-hidden="true" />
        <div className="sw-sheet__title">{isHe ? 'החלף תרגיל' : 'Swap exercise'}</div>
        <div className="sw-sheet__sub">
          {isHe ? 'במקום: ' : 'Instead of: '}<strong>{label(exerciseName)}</strong>
          {current ? ` · ${current.muscle}` : ''}
        </div>

        {alternatives.length === 0 ? (
          <div className="sw-sheet__empty">
            {isHe
              ? 'לא נמצאה חלופה שמתאימה לציוד שלך ולא כבר באימון. אפשר לעדכן את הציוד בהגדרות.'
              : 'No alternative matches your equipment and isn’t already in this workout. You can update your equipment in Settings.'}
          </div>
        ) : (
          <ul className="sw-list">
            {alternatives.map((alt) => {
              const clip = alt.video ? getExerciseVideo(alt.name, base) : null;
              return (
                <li key={alt.id}>
                  <button type="button" className="sw-item" onClick={() => onPick(alt, { permanent: allowPermanent && permanent })}>
                    <span className="sw-item__thumb" aria-hidden="true">
                      {clip
                        ? <video src={`${clip}#t=0.6`} preload="metadata" muted playsInline tabIndex={-1} />
                        : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11" /></svg>}
                    </span>
                    <span className="sw-item__body">
                      <span className="sw-item__name">{label(alt.name)}</span>
                      <span className="sw-item__meta">
                        {alt.equipment.map((e) => EQUIPMENT_LABELS[e]?.[isHe ? 'he' : 'en'] || e).join(' · ')}
                        {' · '}{DIFFICULTY_LABELS[alt.difficulty][isHe ? 'he' : 'en']}
                      </span>
                    </span>
                    {alt.isEasier && <span className="sw-item__badge">{isHe ? 'קל יותר' : 'Easier'}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {allowPermanent && alternatives.length > 0 && (
          <label className="sw-perm">
            <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} />
            <span>{isHe ? 'החלף גם בתוכנית השבועית' : 'Also replace it in my weekly plan'}</span>
          </label>
        )}
        <button type="button" className="sw-close" onClick={onClose}>{isHe ? 'ביטול' : 'Cancel'}</button>
      </div>
    </>
  );
}
