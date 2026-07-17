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

export default function ProgressionPanel({ api }) {
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
        if (pct >= 0.4) {
          reachCandidates.push({ id, have, need: th.need, pct, stat: th.stat });
          continue;
        }
      }
      locked.push({ id });
    }

    // Pick top 3 closest "within reach"
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
      <div className="page-header">
        <h1>{t.progressionTitle}</h1>
        <p>{t.progressionSubtitle}</p>
      </div>

      {/* ─── Hero: Level ring + clear CTA ───────────────────── */}
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
            🔥 {data.currentStreak} {isHe ? 'ימים ברצף' : 'day streak'}
          </div>
        )}
      </div>

      {/* ─── Streak summary cards ───────────────────────────── */}
      <div className="streak-grid">
        <div className="streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-value">{data.currentStreak}<span style={{ fontSize: 14, fontWeight: 400 }}> {t.days}</span></div>
          <div className="streak-label">{t.currentStreak}</div>
        </div>
        <div className="streak-card">
          <div className="streak-icon">🥗</div>
          <div className="streak-value">{data.calorieStreak}<span style={{ fontSize: 14, fontWeight: 400 }}> {t.days}</span></div>
          <div className="streak-label">{t.longestStreak}</div>
        </div>
        <div className="streak-card">
          <div className="streak-icon">📅</div>
          <div className="streak-value">{data.weekStreaksCompleted}</div>
          <div className="streak-label">{t.weekStreaks}</div>
        </div>
      </div>

      {/* ─── RPG Stats ──────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3>{t.statsTitle}</h3>
        </div>
        <div className="rpg-stats">
          {[
            // Prototype's "אחוזי התקדמות" palette: discipline teal, strength
            // pink, weight-goal amber, sleep purple — one hue per stat so the
            // bars read as distinct categories rather than a status gradient.
            { key: 'discipline', label: t.statDiscipline, icon: '🎯', color: '#2FE3C2' },
            { key: 'strength',   label: t.statStrength,   icon: '💪', color: '#F5698C' },
            { key: 'recovery',   label: t.statRecovery,   icon: '⚖️', color: '#FFB648' },
            { key: 'sleep',      label: t.statSleep,      icon: '🌙', color: '#8F8AF7' },
          ].map(stat => {
            const val = data.stats?.[stat.key] || 0;
            return (
              <div className="rpg-stat-row" key={stat.key}>
                <div className="rpg-stat-header">
                  <span className="rpg-stat-icon">{stat.icon}</span>
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

      {/* ─── Tier 1: Within reach (focused, prominent cards) ── */}
      {tiers.reach.length > 0 && (
        <div className="tier-section">
          <div className="tier-section__header" style={{ cursor: 'default' }}>
            <div className="tier-section__title">
              ⚡ {isHe ? 'במרחק נגיעה' : 'Within reach'}
              <span className="tier-section__count">{tiers.reach.length}</span>
            </div>
          </div>
          <div className="within-reach-grid">
            {tiers.reach.map(({ id, have, need, pct }) => (
              <div className="within-reach-card" key={id}>
                <div className="within-reach-card__top">
                  <div className="within-reach-card__icon">{BADGE_ICONS[id]}</div>
                  <div>
                    <div className="within-reach-card__name">{t[`badge_${id}`] || id}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t[`badge_${id}_desc`] || ''}</div>
                  </div>
                </div>
                <div>
                  <div className="within-reach-card__progress">
                    <span><strong>{have}</strong> / {need}</span>
                    <span>{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="within-reach-card__bar" style={{ marginTop: 4 }}>
                    <div className="within-reach-card__bar-fill" style={{ width: `${pct * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tier 2: Unlocked (collapsible) ─────────────────── */}
      <div className={`tier-section${unlockedOpen ? '' : ' tier-section--collapsed'}`}>
        <div className="tier-section__header" onClick={() => setUnlockedOpen(!unlockedOpen)}>
          <div className="tier-section__title">
            ✓ {isHe ? 'פתחת' : 'Unlocked'}
            <span className="tier-section__count" style={{ background: 'rgba(34, 197, 94, 0.10)', color: 'var(--success)' }}>
              {tiers.unlocked.length}
            </span>
          </div>
          <span className="tier-section__chevron">▾</span>
        </div>
        {unlockedOpen && (
          <div className="badges-grid">
            {tiers.unlocked.map(({ id }) => (
              <div key={id} className="badge-item earned">
                <div className="badge-icon-wrapper">
                  <span className="badge-icon">{BADGE_ICONS[id]}</span>
                  <span className="badge-check">✓</span>
                </div>
                <div className="badge-name">{t[`badge_${id}`] || id}</div>
                <div className="badge-desc">{t[`badge_${id}_desc`] || ''}</div>
              </div>
            ))}
            {tiers.unlocked.length === 0 && (
              <div style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--text-4)', textAlign: 'center', padding: 12 }}>
                {isHe ? 'עדיין אין הישגים פתוחים — תתחיל!' : 'No achievements yet — get started!'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Tier 3: Locked (collapsed by default, dimmed) ─── */}
      <div className={`tier-section${lockedOpen ? '' : ' tier-section--collapsed'}`}>
        <div className="tier-section__header" onClick={() => setLockedOpen(!lockedOpen)}>
          <div className="tier-section__title">
            🔒 {isHe ? 'נעולים' : 'Locked'}
            <span className="tier-section__count">{tiers.locked.length}</span>
          </div>
          <span className="tier-section__chevron">▾</span>
        </div>
        {lockedOpen && (
          <div className="badges-grid">
            {tiers.locked.map(({ id }) => (
              <div key={id} className="badge-item locked">
                <div className="badge-icon-wrapper">
                  <span className="badge-icon">{BADGE_ICONS[id]}</span>
                </div>
                <div className="badge-name">{t[`badge_${id}`] || id}</div>
                <div className="badge-desc">{t[`badge_${id}_desc`] || ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Recent XP activity ─────────────────────────────── */}
      {data.recentXP?.length > 0 && (
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
