import { useMemo, useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

// ─── Calorie line area chart (real 7-day history) ─────────
function CalorieLineArea({ days, calorieTarget, isHe }) {
  const W = 720, H = 160;
  const PAD_L = 40, PAD_R = 16, PAD_T = 16, PAD_B = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  // days is an array of { label, value } for the past 7 days, today = last
  const values = days.map(d => d.value || 0);
  const minV = Math.min(...values, calorieTarget) - 200;
  const maxV = Math.max(...values, calorieTarget) + 200;
  const span = Math.max(1, maxV - minV);

  const xFor = (i) => PAD_L + (i / 6) * innerW;
  const yFor = (v) => PAD_T + (1 - (v - minV) / span) * innerH;

  const linePath = values.map((v, i) =>
    (i === 0 ? 'M' : 'L') + xFor(i).toFixed(1) + ' ' + yFor(v).toFixed(1)
  ).join(' ');
  const areaPath = `${linePath} L ${xFor(6).toFixed(1)} ${(H - PAD_B).toFixed(1)} L ${xFor(0).toFixed(1)} ${(H - PAD_B).toFixed(1)} Z`;
  const targetY = yFor(calorieTarget);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: H, display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="calFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PAD_L} y1={targetY} x2={W - PAD_R} y2={targetY}
            stroke="rgba(125,125,125,0.30)" strokeDasharray="4 4" strokeWidth="1" />
      <text x={W - PAD_R - 4} y={targetY - 4} textAnchor="end" fontFamily="Heebo" fontSize="10" fontWeight="700" fill="#7e879d">
        {isHe ? `יעד · ${calorieTarget}` : `target · ${calorieTarget}`}
      </text>
      <path d={areaPath} fill="url(#calFill)" />
      <path d={linePath} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(v)} r={i === 6 ? 5 : 3}
                fill={i === 6 ? 'currentColor' : '#fbbf24'}
                stroke={i === 6 ? '#fbbf24' : 'none'}
                strokeWidth={i === 6 ? 2.5 : 0}
                style={{ color: 'var(--bg-0)' }} />
      ))}
      {days.map((d, i) => (
        <text key={i} x={xFor(i)} y={H - 10} textAnchor="middle" fontFamily="Assistant" fontSize="11" fill="#7e879d">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// ─── Sleep mini chart (7-day bar chart) ───────────────────
function SleepWeekChart({ entries, target, isHe }) {
  // entries: array of { label, hours, isToday }
  const W = 360, H = 100;
  const PAD = 10;
  const colCount = entries.length;
  const colW = (W - PAD * 2) / colCount;
  const maxH = 12; // hours scale max
  const innerH = H - 30;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: H, display: 'block' }} aria-hidden="true">
      {/* target line */}
      <line
        x1={PAD} y1={H - 20 - (target / maxH) * innerH}
        x2={W - PAD} y2={H - 20 - (target / maxH) * innerH}
        stroke="rgba(45,212,191,0.45)" strokeDasharray="3 3" strokeWidth="1"
      />
      {entries.map((e, i) => {
        const h = e.hours || 0;
        const barH = (h / maxH) * innerH;
        const x = PAD + i * colW + 4;
        const w = colW - 8;
        const y = H - 20 - barH;
        const meetsGoal = h >= target;
        const fill = h === 0 ? 'rgba(125,125,125,0.10)' : (meetsGoal ? '#2dd4bf' : '#f59e0b');
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={Math.max(2, barH)} rx="3" fill={fill} opacity={e.isToday ? 1 : 0.85} />
            {h > 0 && (
              <text x={x + w / 2} y={y - 3} textAnchor="middle" fontFamily="Heebo" fontSize="9" fontWeight="700" fill="#7e879d">
                {h}
              </text>
            )}
            <text x={x + w / 2} y={H - 6} textAnchor="middle" fontFamily="Assistant" fontSize="10" fill={e.isToday ? 'var(--accent)' : '#7e879d'} fontWeight={e.isToday ? 700 : 500}>
              {e.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Progress({ nutrition, todayNutrition, workoutHistory, profile, api }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';

  const workouts = workoutHistory?.workouts || [];
  const calorieTarget = nutrition?.calorieTarget || 2000;
  const todayCalories = todayNutrition?.totalCalories || 0;

  // ─── Real data fetched from server ─────────────────────────
  const [nutritionHistory, setNutritionHistory] = useState([]);
  const [sleepHistory, setSleepHistory] = useState([]);
  const [sleepRec, setSleepRec] = useState(null);

  // ─── Time range filter (audit: range tabs) ─────────────────
  // The charts still show ~7 columns regardless — wider ranges aggregate
  // into weekly buckets so the visuals stay readable on mobile.
  const [range, setRange] = useState(7); // 7 | 30 | 90
  const bucketsCount = range === 7 ? 7 : range === 30 ? 4 : 9;
  const daysPerBucket = Math.max(1, Math.round(range / bucketsCount));

  useEffect(() => {
    if (!api) return;
    api('/nutrition/history').then(setNutritionHistory).catch(() => {});
    api('/sleep/history').then(setSleepHistory).catch(() => {});
    api('/sleep/today').then((r) => setSleepRec(r.recommendation)).catch(() => {});
  }, []); // eslint-disable-line

  // ─── Build last 7 days ─────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayLabelsHe = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const dayLabelsEn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayLabels = isHe ? dayLabelsHe : dayLabelsEn;

  const last7Workouts = useMemo(() => {
    // For 7-day range: one bucket per day. For 30/90: each bucket aggregates
    // daysPerBucket days so the chart stays readable.
    return Array.from({ length: bucketsCount }, (_, i) => {
      const bucketEnd = new Date(today);
      bucketEnd.setDate(today.getDate() - (bucketsCount - 1 - i) * daysPerBucket);
      bucketEnd.setHours(0, 0, 0, 0);
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketEnd.getDate() - daysPerBucket + 1);
      const next = new Date(bucketEnd);
      next.setDate(bucketEnd.getDate() + 1);
      const w = workouts.filter(w => {
        const dt = new Date(w.date);
        return dt >= bucketStart && dt < next;
      });
      const label = range === 7
        ? dayLabels[bucketEnd.getDay()]
        : `${bucketEnd.getDate()}/${bucketEnd.getMonth() + 1}`;
      return {
        date: bucketEnd,
        label,
        count: w.length,
        calories: w.reduce((sum, x) => sum + (x.caloriesBurned || 0), 0),
      };
    });
  }, [workouts, range, bucketsCount, daysPerBucket]); // eslint-disable-line

  const maxBar = Math.max(2, ...last7Workouts.map(d => d.count));

  // Calorie line — same bucket strategy as workouts. For >7-day ranges we
  // average daily totals within each bucket so the line stays a "typical
  // day" estimate rather than a sum (which would shoot up).
  const last7Calories = useMemo(() => {
    return Array.from({ length: bucketsCount }, (_, i) => {
      const bucketEnd = new Date(today);
      bucketEnd.setDate(today.getDate() - (bucketsCount - 1 - i) * daysPerBucket);
      bucketEnd.setHours(0, 0, 0, 0);
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketEnd.getDate() - daysPerBucket + 1);
      const next = new Date(bucketEnd);
      next.setDate(bucketEnd.getDate() + 1);

      const isLatest = i === bucketsCount - 1;
      let total = 0;
      let count = 0;
      if (isLatest && range === 7) {
        // Match the legacy 7-day flow exactly: latest bucket = today's live value
        total = todayCalories;
        count = 1;
      } else {
        nutritionHistory.forEach(l => {
          const ld = new Date(l.date);
          if (ld >= bucketStart && ld < next) {
            total += l.totalCalories || 0;
            count += 1;
          }
        });
        // Fold today's live value into the latest bucket for ranges > 7
        if (isLatest && todayCalories > 0) {
          total += todayCalories;
          count += 1;
        }
      }
      const value = count > 0 ? Math.round(total / count) : 0;
      const label = range === 7
        ? dayLabels[bucketEnd.getDay()]
        : `${bucketEnd.getDate()}/${bucketEnd.getMonth() + 1}`;
      return { label, value };
    });
  }, [nutritionHistory, todayCalories, range, bucketsCount, daysPerBucket]); // eslint-disable-line

  // 7-day sleep entries (real data)
  const last7Sleep = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const log = sleepHistory.find(s => {
        const sd = new Date(s.date);
        sd.setHours(0, 0, 0, 0);
        return sd.getTime() === d.getTime();
      });
      return {
        label: dayLabels[d.getDay()],
        hours: log?.hours || 0,
        quality: log?.quality,
        isToday: i === 6,
      };
    });
  }, [sleepHistory]); // eslint-disable-line

  // Last night's sleep (most recent log within the past 2 days)
  const lastNightSleep = useMemo(() => {
    if (!sleepHistory.length) return null;
    return sleepHistory[0]; // already sorted desc by date
  }, [sleepHistory]);

  const sleepTargetMin = sleepRec?.min || 7;
  const sleepTargetMax = sleepRec?.max || 9;

  // ─── Insight headline (real data) ──────────────────────────
  // Compute weekly workout adherence + average sleep + average calorie adherence
  const workoutsThisWeek = last7Workouts.reduce((s, d) => s + d.count, 0);
  const workoutTarget = profile?.workoutsPerWeek || 4;
  const workoutPct = Math.min(100, Math.round((workoutsThisWeek / workoutTarget) * 100));

  const loggedDays = last7Calories.filter(d => d.value > 0);
  const avgCalories = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.value, 0) / loggedDays.length)
    : 0;
  const calorieAdherence = avgCalories > 0
    ? Math.round((1 - Math.abs(avgCalories - calorieTarget) / calorieTarget) * 100)
    : 0;

  const sleepDays = last7Sleep.filter(d => d.hours > 0);
  const avgSleep = sleepDays.length
    ? Math.round((sleepDays.reduce((s, d) => s + d.hours, 0) / sleepDays.length) * 10) / 10
    : 0;

  // Pick the "headline" metric that's most relevant
  let headline;
  if (workoutsThisWeek >= workoutTarget) {
    headline = {
      sign: '✓',
      cls: 'positive',
      title: isHe
        ? `יעד שבועי הושלם — ${workoutsThisWeek}/${workoutTarget} אימונים`
        : `Weekly target hit — ${workoutsThisWeek}/${workoutTarget} workouts`,
      sub: isHe
        ? <>תמשיך — אתה <strong>בקצב היעד</strong>.</>
        : <>Keep going — you're <strong>on goal pace</strong>.</>,
    };
  } else if (workoutsThisWeek > 0) {
    headline = {
      sign: workoutsThisWeek,
      cls: 'positive',
      title: isHe
        ? `${workoutsThisWeek}/${workoutTarget} אימונים השבוע`
        : `${workoutsThisWeek}/${workoutTarget} workouts this week`,
      sub: isHe
        ? <>עוד <strong>{workoutTarget - workoutsThisWeek} אימונים</strong> כדי לסיים את השבוע ביעד.</>
        : <>{workoutTarget - workoutsThisWeek} more <strong>workouts</strong> to close the week.</>,
    };
  } else {
    headline = {
      sign: '0',
      cls: 'neutral',
      title: isHe ? 'עדיין אין אימונים השבוע' : 'No workouts this week yet',
      sub: isHe
        ? <>התחל היום — אפילו אימון <strong>של 20 דקות</strong> סופר.</>
        : <>Start today — even a <strong>20-minute</strong> session counts.</>,
    };
  }

  // ─── Week records (real metrics from actual workouts) ─────
  const weekRecords = useMemo(() => {
    if (!workouts.length) return [];
    const last30 = workouts.filter(w => {
      const dt = new Date(w.date);
      const cutoff = new Date(today);
      cutoff.setDate(today.getDate() - 30);
      return dt >= cutoff;
    });
    if (!last30.length) return [];

    const longest = last30.reduce((max, w) => (w.durationMinutes > (max?.durationMinutes || 0) ? w : max), null);
    const hottest = last30.reduce((max, w) => (w.caloriesBurned > (max?.caloriesBurned || 0) ? w : max), null);
    const longestStreakDay = (() => {
      // Longest gap-free streak in last 30 days isn't trivial — show day with most workouts instead
      const byDay = {};
      for (const w of last30) {
        const d = new Date(w.date);
        d.setHours(0, 0, 0, 0);
        const k = d.getTime();
        byDay[k] = (byDay[k] || 0) + 1;
      }
      const top = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
      return top ? { date: new Date(parseInt(top[0])), count: top[1] } : null;
    })();

    const records = [];
    if (longest && longest.durationMinutes > 0) {
      records.push({
        icon: '⏱',
        name: isHe ? 'אימון הכי ארוך' : 'Longest session',
        sub: new Date(longest.date).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' }),
        value: `${longest.durationMinutes} ${isHe ? 'דק\'' : 'min'}`,
      });
    }
    if (hottest && hottest.caloriesBurned > 0) {
      records.push({
        icon: '🔥',
        name: isHe ? 'הכי הרבה קלוריות' : 'Most calories burned',
        sub: new Date(hottest.date).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' }),
        value: `${hottest.caloriesBurned} ${t.kcal}`,
      });
    }
    if (longestStreakDay && longestStreakDay.count >= 2) {
      records.push({
        icon: '💪',
        name: isHe ? 'הכי הרבה אימונים ביום' : 'Most workouts in a day',
        sub: longestStreakDay.date.toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' }),
        value: `${longestStreakDay.count}`,
      });
    }
    return records;
  }, [workouts]); // eslint-disable-line

  // Sleep XP info for the user
  const sleepXP = lastNightSleep
    ? lastNightSleep.hours >= sleepTargetMax
      ? 35
      : lastNightSleep.hours >= sleepTargetMin
      ? 25
      : 0
    : 0;

  return (
    <>
      <div className="page-header">
        <h1>{t.progress}</h1>
        <p>{t.trackProgress}</p>
      </div>

      {/* ─── Range tabs (audit: 7d/30d/90d quick filter) ────── */}
      <div className="range-tabs" role="tablist" aria-label={isHe ? 'טווח זמן' : 'Time range'}>
        {[
          { v: 7,  label: isHe ? '7 ימים' : '7 days' },
          { v: 30, label: isHe ? '30 ימים' : '30 days' },
          { v: 90, label: isHe ? '90 ימים' : '90 days' },
        ].map((r) => (
          <button
            key={r.v}
            role="tab"
            aria-selected={range === r.v}
            className={`range-tabs__btn${range === r.v ? ' range-tabs__btn--active' : ''}`}
            onClick={() => setRange(r.v)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ─── Insight headline ────────────────────────────────── */}
      <div className="insight-headline">
        <div className={`insight-headline__delta insight-headline__delta--${headline.cls}`}>
          {headline.sign}
        </div>
        <div>
          <div className="insight-headline__title">{headline.title}</div>
          <div className="insight-headline__sub">{headline.sub}</div>
        </div>
      </div>

      {/* ─── Last night's sleep + 7-day chart ────────────────── */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">
            🌙 {isHe ? 'הלילה האחרון' : 'Last night'}
          </div>
          <div className="chart-card__meta" style={{ color: 'var(--accent)' }}>
            {isHe ? `יעד ${sleepTargetMin}-${sleepTargetMax} שעות` : `target ${sleepTargetMin}-${sleepTargetMax}h`}
          </div>
        </div>
        {lastNightSleep ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 18, alignItems: 'center', marginBottom: 14 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em',
                color: lastNightSleep.hours >= sleepTargetMin ? 'var(--accent)' : 'var(--warning)',
                lineHeight: 1,
              }}>
                {lastNightSleep.hours}
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-3)', marginInlineStart: 6 }}>
                  {isHe ? 'שעות' : 'h'}
                </span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
                {lastNightSleep.hours >= sleepTargetMax ? (
                  isHe
                    ? <>שינה מצוינת — מרבית את ההתאוששות.</>
                    : <>Great sleep — maximum recovery.</>
                ) : lastNightSleep.hours >= sleepTargetMin ? (
                  isHe
                    ? <>בטווח המומלץ. שמור על קצב כזה.</>
                    : <>In the recommended range. Keep it up.</>
                ) : (
                  isHe
                    ? <>מתחת ליעד — נסה להוסיף שעה.</>
                    : <>Below target — try to add an hour.</>
                )}
              </div>
              {sleepXP > 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: 'var(--accent-glow)',
                  border: '1px solid rgba(45,212,191,0.25)',
                  borderRadius: 'var(--r-md)',
                  padding: '8px 14px',
                  minWidth: 80,
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>+{sleepXP}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>XP</span>
                </div>
              )}
            </div>
            <SleepWeekChart entries={last7Sleep} target={sleepTargetMin} isHe={isHe} />
            {avgSleep > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>
                {isHe
                  ? <>ממוצע השבוע: <strong style={{ color: 'var(--text-1)' }}>{avgSleep} שעות</strong></>
                  : <>Weekly average: <strong style={{ color: 'var(--text-1)' }}>{avgSleep}h</strong></>}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--text-3)', fontSize: 13 }}>
            {isHe
              ? 'עדיין לא רשמת שינה — הוסף את הלילה האחרון בלוח המחוונים כדי לקבל XP ומדידת התאוששות.'
              : 'No sleep logged yet — log last night on the dashboard to earn XP and track recovery.'}
          </div>
        )}
      </div>

      {/* ─── Workouts bar chart (last 7 days, real) ──────────── */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">
            {isHe ? `אימונים · ${range} ימים אחרונים` : `Workouts · last ${range} days`}
          </div>
          <div className="chart-card__meta">
            {workoutsThisWeek}/{workoutTarget} {isHe ? `(${workoutPct}%)` : `(${workoutPct}%)`}
          </div>
        </div>
        <div className="bar-chart">
          {last7Workouts.map((d, i) => {
            const heightPct = d.count > 0 ? (d.count / maxBar) * 100 : 0;
            return (
              <div key={i} className="bar-chart__col">
                <div className="bar-chart__bar-wrap">
                  <div
                    className={`bar-chart__bar${d.count === 0 ? ' bar-chart__bar--empty' : ''}`}
                    style={{ height: d.count === 0 ? 8 : `${heightPct}%` }}
                    title={`${d.count} ${isHe ? 'אימונים' : 'workouts'}`}
                  />
                </div>
                <div className="bar-chart__label">{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Calorie line area (last 7 days, real) ───────────── */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">
            {isHe ? `קלוריות · ${range} ימים אחרונים` : `Calories · last ${range} days`}
          </div>
          <div className="chart-card__meta" style={{ color: 'var(--c-cal)' }}>
            {avgCalories > 0
              ? (isHe
                  ? `ממוצע ${avgCalories.toLocaleString()} (יעד ${calorieTarget.toLocaleString()})`
                  : `avg ${avgCalories.toLocaleString()} (target ${calorieTarget.toLocaleString()})`)
              : (isHe ? 'אין נתונים' : 'no data yet')}
          </div>
        </div>
        <CalorieLineArea days={last7Calories} calorieTarget={calorieTarget} isHe={isHe} />
      </div>

      {/* ─── Week records (real metrics from workout log) ───── */}
      {weekRecords.length > 0 && (
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">
              {isHe ? 'שיאי החודש' : 'Monthly highs'}
            </div>
            <div className="chart-card__meta" style={{ color: 'var(--warning)' }}>
              🏆 {weekRecords.length}
            </div>
          </div>
          {weekRecords.map((pr, i) => (
            <div className="pr-row" key={i}>
              <div className="pr-row__icon">{pr.icon}</div>
              <div>
                <div className="pr-row__name">{pr.name}</div>
                <div className="pr-row__sub">{pr.sub}</div>
              </div>
              <div className="pr-row__value">{pr.value}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
