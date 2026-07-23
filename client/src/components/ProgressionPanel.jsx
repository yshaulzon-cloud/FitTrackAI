import { useState, useEffect, useMemo } from 'react';
import { useLang } from '../context/LanguageContext';

const BADGE_ICONS = {
  first_workout: '👟', workout_10: '🏋️', workout_25: '🔨', workout_50: '⚡', workout_100: '🏆', workout_200: '🫡',
  streak_3: '🔥', streak_7: '💎', streak_14: '⭐', streak_30: '👑', streak_60: '🐉', streak_100: '🦅',
  level_3: '🌱', level_5: '🎓', level_10: '⚔️', level_15: '🛡️', level_20: '🥇', level_30: '💠',
  first_calorie_goal: '🍽️', first_protein_goal: '🥩',
  nutrition_streak_7: '🥗', nutrition_streak_4: '🧑‍🍳', nutrition_streak_8: '🏅', nutrition_streak_12: '👨‍🍳',
  xp_500: '🪙', xp_1000: '💰', xp_2500: '💵', xp_5000: '💎', xp_10000: '🌟', xp_25000: '☀️',
  first_sleep: '🌙', sleep_7: '😴', sleep_14: '💤', sleep_30: '🛏️', sleep_logs_30: '📋', sleep_logs_100: '📊',
};

// The prototype tints each badge disc and progress bar by what the badge is
// about, so a wall of them reads as categories rather than one teal blur.
function badgeTint(id) {
  if (id.startsWith('streak_')) return 'var(--streak)';
  if (id.startsWith('sleep') || id === 'first_sleep') return 'var(--violet)';
  if (id.startsWith('nutrition_') || id === 'first_calorie_goal' || id === 'first_protein_goal') return 'var(--c-carbs)';
  if (id.startsWith('xp_')) return 'var(--c-fat)';
  if (id.startsWith('level_')) return 'var(--c-protein)';
  return 'var(--accent)'; // workouts
}

// Small functional-icon set matching the nav bar's stroke-line style (see
// NavTabIcon in Dashboard.jsx / StIc / ObIcon) — used for the stat-row and
// streak-card icons, which are category markers, not gamification badges.
// The 30-entry BADGE_ICONS trophy list above is deliberately left as emoji:
// per the prototype's own design note, emoji are reserved for gamification
// celebration, and hand-designing 30 bespoke trophy icons is a separate,
// much larger pass than this one.
function StatIcon({ type, color = 'currentColor', size = 17 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'target')   return <svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>;
  if (type === 'dumbbell') return <svg {...p}><path d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11" /></svg>;
  if (type === 'scale')    return <svg {...p}><path d="M12 3v18M7 21h10M5 7h6M5 7l-3 6a3 3 0 0 0 6 0zM17 7l-3 6a3 3 0 0 0 6 0zM12 3l5 4M12 3 7 7" /></svg>;
  if (type === 'moon')     return <svg {...p}><path d="M20 14A8.5 8.5 0 1 1 10 4a7 7 0 0 0 10 10z" /></svg>;
  if (type === 'flame')    return <svg {...p}><path d="M12 3c1 3.5 5 5.5 5 9.5a5 5 0 0 1-10 0C7 10 8.5 8.5 9.5 7c.5 1.5 1.3 2.4 2.8 3-.8-2.3-.8-4.7-.3-7z" /></svg>;
  if (type === 'salad')    return <svg {...p}><path d="M8 3v6a2 2 0 1 0 4 0V3" /><path d="M10 3v18" /><path d="M16 3c-1.8 0-3 1.8-3 4.5S14.2 12 16 12" /><path d="M16 3v18" /></svg>;
  if (type === 'calendar') return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
  return null;
}

const ALL_BADGES = [
  'first_workout', 'workout_10', 'workout_25', 'workout_50', 'workout_100', 'workout_200',
  'streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100',
  'level_3', 'level_5', 'level_10', 'level_15', 'level_20', 'level_30',
  'first_calorie_goal', 'first_protein_goal',
  'nutrition_streak_7', 'nutrition_streak_4', 'nutrition_streak_8', 'nutrition_streak_12',
  'xp_500', 'xp_1000', 'xp_2500', 'xp_5000', 'xp_10000', 'xp_25000',
  'first_sleep', 'sleep_7', 'sleep_14', 'sleep_30', 'sleep_logs_30', 'sleep_logs_100',
];

// Threshold map — each badge's required value, used to compute "within reach" progress
const BADGE_THRESHOLDS = {
  first_workout: { stat: 'workouts', need: 1 },
  workout_10:   { stat: 'workouts', need: 10 },
  workout_25:   { stat: 'workouts', need: 25 },
  workout_50:   { stat: 'workouts', need: 50 },
  workout_100:  { stat: 'workouts', need: 100 },
  workout_200:  { stat: 'workouts', need: 200 },
  streak_3:    { stat: 'streak', need: 3 },
  streak_7:    { stat: 'streak', need: 7 },
  streak_14:   { stat: 'streak', need: 14 },
  streak_30:   { stat: 'streak', need: 30 },
  streak_60:   { stat: 'streak', need: 60 },
  streak_100:  { stat: 'streak', need: 100 },
  level_3:  { stat: 'level', need: 3 },
  level_5:  { stat: 'level', need: 5 },
  level_10: { stat: 'level', need: 10 },
  level_15: { stat: 'level', need: 15 },
  level_20: { stat: 'level', need: 20 },
  level_30: { stat: 'level', need: 30 },
  xp_500:   { stat: 'xp', need: 500 },
  xp_1000:  { stat: 'xp', need: 1000 },
  xp_2500:  { stat: 'xp', need: 2500 },
  xp_5000:  { stat: 'xp', need: 5000 },
  xp_10000: { stat: 'xp', need: 10000 },
  xp_25000: { stat: 'xp', need: 25000 },
};

const XP_EVENT_LABELS = {
  workout: 'xpWorkout',
  calorie_goal: 'xpCalorieGoal',
  protein_goal: 'xpProteinGoal',
  streak_day: 'xpStreakDay',
  streak_week: 'xpStreakWeek',
  sleep_goal: 'xpSleepGoal',
  sleep_great: 'xpSleepGreat',
};

// ─── Hero progress ring ───────────────────────────────────
function LevelRing({ level, percent }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(percent, 100) / 100) * c;
  return (
    <div className="xp-hero__ring-wrap">
      <svg className="xp-hero__ring-svg" viewBox="0 0 130 130">
        <defs>
          {/* Audit P06: XP ring used to fade purple→mint, which made the
              gamification surface read as a different app (none of the
              dashboard uses purple). Unified to the streak amber so XP and
              streaks share one earned-progress color. */}
          <linearGradient id="levelRingGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#36E8C6" />
            <stop offset="100%" stopColor="#2FE3C2" />
          </linearGradient>
        </defs>
        <circle cx="65" cy="65" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
        <circle
          cx="65" cy="65" r={r}
          stroke="url(#levelRingGrad)" strokeWidth="10" fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="xp-hero__ring-text">
        <span className="xp-hero__ring-level">level</span>
        <span className="xp-hero__ring-num">{level}</span>
      </div>
    </div>
  );
}

// `view` splits the panel into the prototype's Journey sub-tabs:
//   'prog'   → level ring, streak cards, RPG stat bars, recent XP
//   'badges' → within-reach / unlocked / locked tiers
export default function ProgressionPanel({ api, view = 'prog' }) {
  const showProg = view === 'prog';
  const showBadges = view === 'badges';
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlockedOpen, setUnlockedOpen] = useState(true);
  const [lockedOpen, setLockedOpen] = useState(false);

  useEffect(() => { loadProgression(); }, []);

  async function loadProgression() {
    try {
      const res = await api('/progression/status');
      setData(res);
    } catch (err) {
      console.error('Error loading progression:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Tier badges into within-reach / unlocked / locked ───
  const tiers = useMemo(() => {
    if (!data) return { reach: [], unlocked: [], locked: [] };
    const earnedIds = new Set((data.badges || []).map(b => b.id));

    const stats = {
      workouts: data.totalWorkouts || 0,
      streak:   data.currentStreak || 0,
      level:    data.level || 1,
      xp:       data.totalXP || 0,
    };

    const unlocked = [];
    const locked = [];
    const reachCandidates = [];

    for (const id of ALL_BADGES) {
      if (earnedIds.has(id)) {
        unlocked.push({ id, progress: 1 });
        continue;
      }
      const th = BADGE_THRESHOLDS[id];
      if (th) {
        const have = stats[th.stat] || 0;
        const pct = Math.min(1, have / th.need);
        // Any started badge is a candidate. This used to gate at pct >= 0.4,
        // which suited the old "almost there" framing but leaves the section
        // empty for exactly the new users it should be pulling forward — the
        // redesign asks for the closest N, a ranking, not a threshold.
        if (have > 0) {
          reachCandidates.push({ id, have, need: th.need, pct, stat: th.stat });
          continue;
        }
      }
      locked.push({ id });
    }

    // The three they're closest to finishing
    reachCandidates.sort((a, b) => b.pct - a.pct);
    const reach = reachCandidates.slice(0, 3);
    // Any non-top reach candidates fall back to locked
    locked.push(...reachCandidates.slice(3).map(({ id }) => ({ id })));

    return { reach, unlocked, locked };
  }, [data]);

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }
  if (!data) return null;

  const xpToNext = (data.xpNeededForNext || 0) - (data.xpInCurrentLevel || 0);

  return (
    <>
      {/* Title lives on the Journey tab itself now (prototype). */}

      {/* ─── Hero: Level ring + clear CTA ───────────────────── */}
      {showProg && (
      <div className="xp-hero">
        <LevelRing level={data.level} percent={data.progressPercent} />
        <div className="xp-hero__info">
          <div className="xp-hero__total">{data.totalXP.toLocaleString()} XP</div>
          <div className="xp-hero__cta-text">
            {isHe ? (
              <>עוד <strong>{xpToNext.toLocaleString()} XP</strong> לרמה {data.level + 1}</>
            ) : (
              <>Need <strong>{xpToNext.toLocaleString()} XP</strong> for level {data.level + 1}</>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {data.progressPercent}% {isHe ? 'לרמה הבאה' : 'to next level'}
          </div>
        </div>
        {data.currentStreak > 0 && (
          <div className="xp-hero__streak">
            <StatIcon type="flame" color="var(--streak, #FF9A4D)" size={15} /> {data.currentStreak} {isHe ? 'ימים ברצף' : 'day streak'}
          </div>
        )}
      </div>
      )}

      {/* ─── Streak summary cards ───────────────────────────── */}
      {showProg && (
      <div className="streak-grid">
        <div className="streak-card">
          <div className="streak-icon"><StatIcon type="flame" color="var(--streak, #FF9A4D)" size={28} /></div>
          <div className="streak-value">{data.currentStreak}<span style={{ fontSize: 14, fontWeight: 400 }}> {t.days}</span></div>
          <div className="streak-label">{t.currentStreak}</div>
        </div>
        <div className="streak-card">
          <div className="streak-icon"><StatIcon type="salad" color="var(--c-carbs, #4D9FFF)" size={28} /></div>
          <div className="streak-value">{data.calorieStreak}<span style={{ fontSize: 14, fontWeight: 400 }}> {t.days}</span></div>
          <div className="streak-label">{t.longestStreak}</div>
        </div>
        <div className="streak-card">
          <div className="streak-icon"><StatIcon type="calendar" color="var(--accent, #2FE3C2)" size={28} /></div>
          <div className="streak-value">{data.weekStreaksCompleted}</div>
          <div className="streak-label">{t.weekStreaks}</div>
        </div>
      </div>
      )}

      {/* ─── RPG Stats ──────────────────────────────────────── */}
      {showProg && (
      <div className="card">
        <div className="card-header">
          <h3>{t.statsTitle}</h3>
        </div>
        <div className="rpg-stats">
          {[
            // Prototype's "אחוזי התקדמות" palette: discipline teal, strength
            // pink, weight-goal amber, sleep purple — one hue per stat so the
            // bars read as distinct categories rather than a status gradient.
            { key: 'discipline', label: t.statDiscipline, icon: 'target',   color: '#2FE3C2' },
            { key: 'strength',   label: t.statStrength,   icon: 'dumbbell', color: '#F5698C' },
            { key: 'recovery',   label: t.statRecovery,   icon: 'scale',    color: '#FFB648' },
            { key: 'sleep',      label: t.statSleep,      icon: 'moon',     color: '#8F8AF7' },
          ].map(stat => {
            const val = data.stats?.[stat.key] || 0;
            return (
              <div className="rpg-stat-row" key={stat.key}>
                <div className="rpg-stat-header">
                  <span className="rpg-stat-icon"><StatIcon type={stat.icon} color={stat.color} /></span>
                  <span className="rpg-stat-name">{stat.label}</span>
                  <span className="rpg-stat-value" style={{ color: stat.color }}>{val}%</span>
                </div>
                <div className="rpg-stat-bar-track">
                  <div className="rpg-stat-bar-fill" style={{ width: `${val}%`, background: stat.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ─── Earned ─────────────────────────────────────────── */}
      {showBadges && (
        <>
          <div className="bdg-heading">
            {isHe ? 'הושגו' : 'Earned'} · {tiers.unlocked.length}
          </div>
          {tiers.unlocked.length > 0 ? (
            <div className="bdg-grid">
              {tiers.unlocked.map(({ id }) => (
                <div className="bdg-card" key={id}>
                  <div className="bdg-card__disc" style={{ background: `color-mix(in srgb, ${badgeTint(id)} 11%, transparent)` }}>
                    <span style={{ fontSize: 22 }}>{BADGE_ICONS[id]}</span>
                  </div>
                  <div className="bdg-card__name">{t[`badge_${id}`] || id}</div>
                  <div className="bdg-card__desc">{t[`badge_${id}_desc`] || ''}</div>
                </div>
              ))}
              {/* Keep a 2-badge row from stretching to half-width cards */}
              {tiers.unlocked.length % 3 !== 0 &&
                Array.from({ length: 3 - (tiers.unlocked.length % 3) }, (_, i) => (
                  <div className="bdg-card bdg-card--ghost" key={`ghost-${i}`} aria-hidden="true" />
                ))}
            </div>
          ) : (
            <div className="bdg-empty">
              {isHe ? 'עדיין אין תגים — כל פעילות מקרבת אותך.' : 'No badges yet — every activity gets you closer.'}
            </div>
          )}

          {/* ─── Closest to earning ───────────────────────────── */}
          {tiers.reach.length > 0 && (
            <>
              <div className="bdg-heading">{isHe ? 'הקרובים להשגה' : 'Closest to earning'}</div>
              <div className="bdg-reach">
                {tiers.reach.map(({ id, have, need, pct }) => (
                  <div className="bdg-reach__row" key={id}>
                    <div className="bdg-reach__text">
                      <div className="bdg-reach__name">{t[`badge_${id}`] || id}</div>
                      <div className="bdg-reach__desc">{t[`badge_${id}_desc`] || ''}</div>
                      <div className="bdg-reach__track">
                        <div className="bdg-reach__fill" style={{ width: `${Math.round(pct * 100)}%`, background: badgeTint(id) }} />
                      </div>
                    </div>
                    <span className="bdg-reach__count">{have}/{need}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── The rest ─────────────────────────────────────── */}
          {tiers.locked.length > 0 && (
            <button type="button" className="bdg-more" onClick={() => setLockedOpen(!lockedOpen)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <span>
                {isHe
                  ? `עוד ${tiers.locked.length} תגים · ${lockedOpen ? 'הסתר' : 'הצג הכל'}`
                  : `${tiers.locked.length} more · ${lockedOpen ? 'hide' : 'show all'}`}
              </span>
            </button>
          )}
          {showBadges && lockedOpen && (
            <div className="bdg-grid" style={{ marginTop: 12 }}>
              {tiers.locked.map(({ id }) => (
                <div className="bdg-card bdg-card--locked" key={id}>
                  <div className="bdg-card__disc"><span style={{ fontSize: 22 }}>{BADGE_ICONS[id]}</span></div>
                  <div className="bdg-card__name">{t[`badge_${id}`] || id}</div>
                  <div className="bdg-card__desc">{t[`badge_${id}_desc`] || ''}</div>
                </div>
              ))}
              {tiers.locked.length % 3 !== 0 &&
                Array.from({ length: 3 - (tiers.locked.length % 3) }, (_, i) => (
                  <div className="bdg-card bdg-card--ghost" key={`lghost-${i}`} aria-hidden="true" />
                ))}
            </div>
          )}
        </>
      )}

      {/* ─── Recent XP activity ─────────────────────────────── */}
      {showProg && data.recentXP?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>{t.recentActivity}</h3>
          </div>
          <div className="xp-history">
            {data.recentXP.map((event, i) => (
              <div className="xp-history-item" key={i}>
                <span className="xp-history-label">{t[XP_EVENT_LABELS[event.type]] || event.type}</span>
                <span className="xp-history-amount">+{event.amount} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
