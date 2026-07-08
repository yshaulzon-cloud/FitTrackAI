import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

const classificationColors = {
  underweight: { bg: 'rgba(116, 185, 255, 0.12)', border: 'rgba(116, 185, 255, 0.3)', color: '#74b9ff', icon: '🔵' },
  normal:      { bg: 'rgba(34, 197, 94, 0.12)',   border: 'rgba(34, 197, 94, 0.3)',   color: 'var(--success)', icon: '🟢' },
  overweight:  { bg: 'rgba(245, 158, 11, 0.12)',  border: 'rgba(245, 158, 11, 0.3)',  color: 'var(--warning)', icon: '🟡' },
  obese1:      { bg: 'rgba(251, 146, 60, 0.12)',  border: 'rgba(251, 146, 60, 0.3)',  color: '#fb923c', icon: '🟠' },
  obese2:      { bg: 'rgba(239, 68, 68, 0.12)',   border: 'rgba(239, 68, 68, 0.3)',   color: 'var(--danger)', icon: '🔴' },
  obese3:      { bg: 'rgba(220, 38, 38, 0.12)',   border: 'rgba(220, 38, 38, 0.3)',   color: '#dc2626', icon: '🔴' },
};

const classificationKeys = {
  underweight: 'bmiUnderweight', normal: 'bmiNormal', overweight: 'bmiOverweight',
  obese1: 'bmiObese1', obese2: 'bmiObese2', obese3: 'bmiObese3',
};

const goalLabelsMap = { bulk: 'goalBulk', cut: 'goalCut', maintain: 'goalMaintain' };

function classifyBMI(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25)   return 'normal';
  if (bmi < 30)   return 'overweight';
  if (bmi < 35)   return 'obese1';
  if (bmi < 40)   return 'obese2';
  return 'obese3';
}
function calcBMI(weight, heightCm) {
  const m = heightCm / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}
function bmiToPercent(bmi) { return Math.min(100, Math.max(0, ((bmi - 15) / 30) * 100)); }
function percentToBmi(pct) { return 15 + (pct / 100) * 30; }
function bmiToWeight(bmi, heightCm) {
  const m = heightCm / 100;
  return Math.round(bmi * m * m * 10) / 10;
}

// ─── Journey chart: start → now → target ─────────────────────
// A horizontal "track" that visualizes the full distance to goal,
// with a filled segment for what's covered and a marker for where the
// user is right now. Reads `initialWeightDelta` from /progression/status —
// that field is set on first stat calculation and never goes back up.
function JourneyChart({ startWeight, currentWeight, targetWeight, isHe }) {
  // Layout: current pin labeled ABOVE the track, start/target labeled BELOW.
  // This guarantees the three labels never sit at the same y-coordinate
  // even when the user is right at the starting line.
  const W = 720, H = 210;
  const PAD_L = 60, PAD_R = 60;
  const TRACK_Y = 90;
  const innerW = W - PAD_L - PAD_R;

  // Total distance and progress
  const total = Math.abs(targetWeight - startWeight) || 0.01;
  const covered = Math.max(0, Math.min(total,
    Math.abs(currentWeight - startWeight)
  ));
  const remaining = Math.max(0, total - covered);
  const pct = Math.min(100, Math.round((covered / total) * 100));

  // X positions
  const xStart = PAD_L;
  const xTarget = PAD_L + innerW;
  const xCurrent = PAD_L + (covered / total) * innerW;

  // Hide the "you are here" pin if it overlaps either endpoint.
  // Threshold = 9% of track width (≈ a circle's diameter at this scale).
  const overlapThreshold = innerW * 0.09;
  const overlapsStart  = Math.abs(xCurrent - xStart)  < overlapThreshold;
  const overlapsTarget = Math.abs(xCurrent - xTarget) < overlapThreshold;
  const showCurrentPin = !overlapsStart && !overlapsTarget;

  const trackBase = 'rgba(125,125,125,0.18)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: H, display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="journeyFill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>

      {/* Background track (full distance) */}
      <rect x={xStart} y={TRACK_Y - 8} width={innerW} height={16} rx="8" fill={trackBase} />

      {/* Filled portion (covered) */}
      {covered > 0 && (
        <rect x={xStart} y={TRACK_Y - 8}
              width={Math.max(8, xCurrent - xStart)} height={16}
              rx="8" fill="url(#journeyFill)" />
      )}

      {/* ── Start cap (label + value BELOW the track) ── */}
      <circle cx={xStart} cy={TRACK_Y} r="9" fill="var(--bg-0)" stroke="#8b5cf6" strokeWidth="2.5" />
      <text x={xStart} y={TRACK_Y + 28} textAnchor="middle" fontFamily="Heebo" fontSize="11" fontWeight="700" fill="#7e879d" letterSpacing="0.06em">
        {isHe ? 'התחלה' : 'START'}
      </text>
      <text x={xStart} y={TRACK_Y + 46} textAnchor="middle" fontFamily="Heebo" fontSize="14" fontWeight="800" fill="var(--text-1)">
        {startWeight} {isHe ? 'ק"ג' : 'kg'}
      </text>
      {/* If the user is at the start, mark the start cap with an "אתה כאן" pill BELOW the value */}
      {overlapsStart && (
        <text x={xStart} y={TRACK_Y + 64} textAnchor="middle" fontFamily="Heebo" fontSize="10" fontWeight="700" fill="var(--accent)" letterSpacing="0.08em">
          {isHe ? '· אתה כאן ·' : '· YOU ARE HERE ·'}
        </text>
      )}

      {/* ── Target cap (label + value BELOW the track) ── */}
      <circle cx={xTarget} cy={TRACK_Y} r="9" fill="var(--bg-0)" stroke="#22c55e" strokeWidth="2.5" />
      <text x={xTarget} y={TRACK_Y + 28} textAnchor="middle" fontFamily="Heebo" fontSize="11" fontWeight="700" fill="#22c55e" letterSpacing="0.06em">
        {isHe ? '🚩 יעד' : '🚩 TARGET'}
      </text>
      <text x={xTarget} y={TRACK_Y + 46} textAnchor="middle" fontFamily="Heebo" fontSize="14" fontWeight="800" fill="var(--success)">
        {targetWeight} {isHe ? 'ק"ג' : 'kg'}
      </text>
      {overlapsTarget && (
        <text x={xTarget} y={TRACK_Y + 64} textAnchor="middle" fontFamily="Heebo" fontSize="10" fontWeight="700" fill="var(--accent)" letterSpacing="0.08em">
          {isHe ? '· הגעת ·' : '· YOU MADE IT ·'}
        </text>
      )}

      {/* ── Current pin (label + value ABOVE the track), only when not overlapping ── */}
      {showCurrentPin && (
        <g transform={`translate(${xCurrent}, ${TRACK_Y})`}>
          <circle r="14" fill="rgba(45, 212, 191, 0.20)" />
          <circle r="10" fill="var(--bg-0)" stroke="#2dd4bf" strokeWidth="3" />
          <circle r="3"  fill="#2dd4bf" />
          <text y={-30} textAnchor="middle" fontFamily="Heebo" fontSize="11" fontWeight="700" fill="var(--accent)" letterSpacing="0.06em">
            {isHe ? 'אתה כאן' : 'YOU ARE HERE'}
          </text>
          <text y={-14} textAnchor="middle" fontFamily="Heebo" fontSize="14" fontWeight="800" fill="var(--accent)">
            {currentWeight} {isHe ? 'ק"ג' : 'kg'}
          </text>
        </g>
      )}

      {/* Bottom legend with stats — sits at the very bottom */}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontFamily="Assistant" fontSize="12" fill="#7e879d">
        {isHe
          ? `עברת ${covered.toFixed(1)} ק"ג · נשארו ${remaining.toFixed(1)} ק"ג · ${pct}% הושלם`
          : `${covered.toFixed(1)} kg covered · ${remaining.toFixed(1)} kg to go · ${pct}% complete`}
      </text>
    </svg>
  );
}

// ─── Vertical variant of JourneyChart (mobile audit: vertical track) ───
// Same data, rotated 90°. Target at top, start at bottom, current pin in
// the middle. Labels sit beside their markers so nothing overlaps even on
// narrow phones.
function JourneyChartVertical({ startWeight, currentWeight, targetWeight, isHe }) {
  // All labels use text-anchor="middle" centered on a fixed column so SVG
  // bidi reordering (RTL Hebrew + emoji) can never push text over the
  // markers. Track is centred; start/target labels stack above/below their
  // circles; the "you are here" pin label sits in a side column with a gap.
  const W = 300, H = 520;
  const PAD_T = 100, PAD_B = 100;
  const TRACK_X = W / 2;
  const PIN_LABEL_X = TRACK_X + 80; // side column for the current-pin label
  const innerH = H - PAD_T - PAD_B;
  const kg = isHe ? 'ק"ג' : 'kg';

  const total = Math.abs(targetWeight - startWeight) || 0.01;
  const covered = Math.max(0, Math.min(total, Math.abs(currentWeight - startWeight)));
  const pct = Math.min(100, Math.round((covered / total) * 100));

  const yTarget = PAD_T;
  const yStart = PAD_T + innerH;
  const yCurrent = yStart - (covered / total) * innerH;

  const overlapThreshold = innerH * 0.13;
  const overlapsStart  = Math.abs(yCurrent - yStart)  < overlapThreshold;
  const overlapsTarget = Math.abs(yCurrent - yTarget) < overlapThreshold;
  const showCurrentPin = !overlapsStart && !overlapsTarget;

  const trackBase = 'rgba(125,125,125,0.18)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', maxWidth: 300, height: H, display: 'block', margin: '0 auto' }} aria-hidden="true">
      <defs>
        <linearGradient id="journeyFillV" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%"   stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>

      {/* Background track */}
      <rect x={TRACK_X - 8} y={yTarget} width={16} height={innerH} rx="8" fill={trackBase} />
      {/* Filled portion (from current → start, going down) */}
      {covered > 0 && (
        <rect x={TRACK_X - 8} y={yCurrent}
              width={16} height={Math.max(8, yStart - yCurrent)}
              rx="8" fill="url(#journeyFillV)" />
      )}

      {/* Target cap — labels ABOVE the circle, centred */}
      {overlapsTarget && (
        <text x={TRACK_X} y={yTarget - 68} textAnchor="middle" fontFamily="Heebo" fontSize="11" fontWeight="700" fill="var(--accent)" letterSpacing="0.06em">
          {isHe ? '· הגעת ·' : '· YOU MADE IT ·'}
        </text>
      )}
      <text x={TRACK_X} y={yTarget - 42} textAnchor="middle" fontFamily="Heebo" fontSize="12" fontWeight="700" fill="#22c55e" letterSpacing="0.04em">
        {isHe ? '🚩 יעד' : '🚩 TARGET'}
      </text>
      <text x={TRACK_X} y={yTarget - 20} textAnchor="middle" fontFamily="Heebo" fontSize="16" fontWeight="800" fill="var(--success)">
        {targetWeight} {kg}
      </text>
      <circle cx={TRACK_X} cy={yTarget} r="10" fill="var(--bg-0)" stroke="#22c55e" strokeWidth="2.5" />

      {/* Start cap — labels BELOW the circle, centred */}
      <circle cx={TRACK_X} cy={yStart} r="10" fill="var(--bg-0)" stroke="#8b5cf6" strokeWidth="2.5" />
      <text x={TRACK_X} y={yStart + 32} textAnchor="middle" fontFamily="Heebo" fontSize="12" fontWeight="700" fill="#8b5cf6" letterSpacing="0.04em">
        {isHe ? 'התחלה' : 'START'}
      </text>
      <text x={TRACK_X} y={yStart + 54} textAnchor="middle" fontFamily="Heebo" fontSize="16" fontWeight="800" fill="var(--text-1)">
        {startWeight} {kg}
      </text>
      {overlapsStart && (
        <text x={TRACK_X} y={yStart + 76} textAnchor="middle" fontFamily="Heebo" fontSize="11" fontWeight="700" fill="var(--accent)" letterSpacing="0.06em">
          {isHe ? '· אתה כאן ·' : '· YOU ARE HERE ·'}
        </text>
      )}

      {/* Current pin — label in a side column, centred (anchor middle) */}
      {showCurrentPin && (
        <g transform={`translate(${TRACK_X}, ${yCurrent})`}>
          <circle r="15" fill="rgba(45, 212, 191, 0.20)" />
          <circle r="10" fill="var(--bg-0)" stroke="#2dd4bf" strokeWidth="3" />
          <circle r="3"  fill="#2dd4bf" />
          <text x={PIN_LABEL_X - TRACK_X} y={-3} textAnchor="middle" fontFamily="Heebo" fontSize="11" fontWeight="700" fill="var(--accent)" letterSpacing="0.04em">
            {isHe ? 'אתה כאן' : 'YOU ARE HERE'}
          </text>
          <text x={PIN_LABEL_X - TRACK_X} y={15} textAnchor="middle" fontFamily="Heebo" fontSize="15" fontWeight="800" fill="var(--accent)">
            {currentWeight} {kg}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Calorie balance bar chart (real 14-day energy trend) ────
// Each bar = (consumed - target) for the day. Below 0 = deficit, above = surplus.
// Bars are colored by whether the balance aligns with the user's goal:
//   • cut:      deficit = teal (good),  surplus = orange (off-pace)
//   • bulk:     surplus = teal (good),  deficit = orange
//   • maintain: |delta| < 200 = teal,   |delta| >= 200 = orange
// Days with no logged meals show as muted dashes at the zero line.
function BalanceChart({ days, goal, isHe }) {
  const W = 720, H = 220;
  const PAD_L = 56, PAD_R = 24, PAD_T = 22, PAD_B = 36;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const balances = days.map(d => d.balance);
  // Symmetric y-domain so 0 is the visual middle. Min span ±400 so single
  // small days don't look exaggerated.
  const maxAbs = Math.max(400, ...balances.map(v => Math.abs(v)));
  const minV = -maxAbs;
  const maxV =  maxAbs;
  const span = maxV - minV;

  const colW = innerW / days.length;
  const xFor = (i) => PAD_L + colW * i + colW * 0.15;
  const barW = colW * 0.7;
  const yFor = (v) => PAD_T + (1 - (v - minV) / span) * innerH;
  const zeroY = yFor(0);

  // Y ticks at -maxAbs, -maxAbs/2, 0, +maxAbs/2, +maxAbs
  const yTicks = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs].map(v => ({
    v, y: yFor(v),
    label: (v > 0 ? '+' : '') + Math.round(v),
  }));

  function colorFor(balance, hasData) {
    if (!hasData) return 'rgba(125,125,125,0.18)';
    const teal = '#2dd4bf';
    const orange = '#f59e0b';
    if (goal === 'cut')  return balance < 0 ? teal : orange;
    if (goal === 'bulk') return balance > 0 ? teal : orange;
    return Math.abs(balance) < 200 ? teal : orange;
  }

  return (
    <svg className="forecast-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* Grid + Y labels */}
      {yTicks.map((tk, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={tk.y} x2={W - PAD_R} y2={tk.y}
                stroke={tk.v === 0 ? 'rgba(125,125,125,0.45)' : 'rgba(125,125,125,0.10)'}
                strokeDasharray={tk.v === 0 ? null : '2 4'}
                strokeWidth={tk.v === 0 ? 1.25 : 1} />
          <text x={PAD_L - 8} y={tk.y + 4} textAnchor="end" fontFamily="Assistant" fontSize="10" fill="#7e879d">
            {tk.label}
          </text>
        </g>
      ))}

      {/* Bars */}
      {days.map((d, i) => {
        const v = d.balance;
        const hasData = d.hasData;
        const color = colorFor(v, hasData);
        if (!hasData) {
          return (
            <g key={i}>
              <line x1={xFor(i) + barW * 0.2} x2={xFor(i) + barW * 0.8} y1={zeroY} y2={zeroY}
                    stroke="rgba(125,125,125,0.30)" strokeDasharray="2 3" strokeWidth="1.5" />
              {d.isToday && (
                <text x={xFor(i) + barW / 2} y={H - 22} textAnchor="middle" fontFamily="Heebo"
                      fontSize="10" fontWeight="700" fill="var(--accent)">
                  {isHe ? 'היום' : 'today'}
                </text>
              )}
              <text x={xFor(i) + barW / 2} y={H - 8} textAnchor="middle" fontFamily="Assistant"
                    fontSize="10" fill={d.isToday ? 'var(--accent)' : '#7e879d'}>
                {d.label}
              </text>
            </g>
          );
        }
        const top = v >= 0 ? yFor(v) : zeroY;
        const h = Math.max(2, Math.abs(yFor(v) - zeroY));
        return (
          <g key={i}>
            <rect x={xFor(i)} y={top} width={barW} height={h} rx="3" fill={color}
                  opacity={d.isToday ? 1 : 0.85} />
            {d.isToday && (
              <text x={xFor(i) + barW / 2} y={H - 22} textAnchor="middle" fontFamily="Heebo"
                    fontSize="10" fontWeight="700" fill="var(--accent)">
                {isHe ? 'היום' : 'today'}
              </text>
            )}
            <text x={xFor(i) + barW / 2} y={H - 8} textAnchor="middle" fontFamily="Assistant"
                  fontSize="10" fill={d.isToday ? 'var(--accent)' : '#7e879d'}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function BMICard({ bmiAnalysis, profile, calorieTarget: calorieTargetProp, api, onUpdate, heroOnly = false }) {
  const { t, lang } = useLang();
  const isHe = lang === 'he';
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [simWeight, setSimWeight] = useState(null);
  const [nutritionHistory, setNutritionHistory] = useState([]);
  const [progressionData, setProgressionData] = useState(null);
  const barRef = useRef(null);
  const dragging = useRef(false);

  // New-goal flow: when the user has hit their target, offer to pick a
  // new direction (cut / bulk / maintain). The chosen goal flips both
  // `profile.goal` and the BMI-driven targetWeight on the server, which
  // cascades through calorie / macro / journey calcs across the app.
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [newGoalChoice, setNewGoalChoice] = useState(null);
  const [savingNewGoal, setSavingNewGoal] = useState(false);
  const [newGoalError, setNewGoalError] = useState('');

  async function handleSetNewGoal() {
    if (!newGoalChoice) return;
    setSavingNewGoal(true);
    setNewGoalError('');
    try {
      await api('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ goal: newGoalChoice }),
      });
      setShowNewGoalModal(false);
      setNewGoalChoice(null);
      if (onUpdate) onUpdate();
    } catch (err) {
      setNewGoalError(err.message || (isHe ? 'שגיאה בעדכון היעד' : 'Failed to update goal'));
    } finally {
      setSavingNewGoal(false);
    }
  }

  // Pull last 14 days of nutrition + progression status (for initialWeightDelta).
  // Re-fetch when the user's goal changes so the journey baseline updates
  // after a goal swap (PUT /user/profile resets initialWeightDelta server-side
  // on goal change; we re-pull it here so the BMICard chart re-anchors).
  useEffect(() => {
    if (!api) return;
    api('/nutrition/history').then(setNutritionHistory).catch(() => {});
    api('/progression/status').then(setProgressionData).catch(() => {});
  }, [profile?.goal]); // eslint-disable-line

  if (!bmiAnalysis || !profile) return null;

  const {
    bmi, classification, healthyRange, targetWeight,
    weightDelta, weeklyRate, weeksToTarget,
    dailyCalorieAdjustment, recommendedGoal,
  } = bmiAnalysis;

  const isSimulating = simWeight !== null;
  const displayWeight = isSimulating ? simWeight : profile.weight;
  const displayBmi = isSimulating ? calcBMI(simWeight, profile.height) : bmi;
  const displayClass = isSimulating ? classifyBMI(displayBmi) : classification;
  const style = classificationColors[displayClass] || classificationColors.normal;
  const classLabel = t[classificationKeys[displayClass]] || displayClass;
  const isHealthy = classification === 'normal';
  const needsLoss = weightDelta > 0 && !isHealthy;
  const months = weeksToTarget > 0 ? Math.round(weeksToTarget / 4.33) : 0;
  const alreadyMatchesGoal = profile?.goal === recommendedGoal;
  const gaugePos = bmiToPercent(displayBmi);

  // Direction for forecast: 'up' = gaining toward target, 'down' = losing toward target, 'stable' = maintain
  const direction = useMemo(() => {
    if (Math.abs(profile.weight - targetWeight) < 0.5) return 'stable';
    return profile.weight < targetWeight ? 'up' : 'down';
  }, [profile.weight, targetWeight]);

  // ── Drag logic for BMI simulator ────────────────────────────
  const handlePointerMove = useCallback((e) => {
    if (!dragging.current || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    let pct = (x / rect.width) * 100;
    pct = Math.min(100, Math.max(0, pct));
    const newBmi = percentToBmi(pct);
    const newWeight = bmiToWeight(newBmi, profile.height);
    setSimWeight(Math.max(30, Math.min(300, newWeight)));
  }, [profile?.height]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    document.removeEventListener('mousemove', handlePointerMove);
    document.removeEventListener('mouseup', handlePointerUp);
    document.removeEventListener('touchmove', handlePointerMove);
    document.removeEventListener('touchend', handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    handlePointerMove(e);
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  async function handleApply() {
    setApplying(true);
    try {
      await api('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ goal: recommendedGoal }),
      });
      setApplied(true);
      setTimeout(() => setApplied(false), 4000);
      onUpdate();
    } catch {
      // silent
    } finally {
      setApplying(false);
    }
  }


  // ─── Build 14-day energy-balance dataset (real /nutrition/history) ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayLabelsHe = ['א','ב','ג','ד','ה','ו','ש'];
  const dayLabelsEn = ['S','M','T','W','T','F','S'];
  const dayLabels = isHe ? dayLabelsHe : dayLabelsEn;

  const calorieTarget = calorieTargetProp || 2000;

  const balanceDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const log = nutritionHistory.find(l => {
        const ld = new Date(l.date);
        return ld >= d && ld < next;
      });
      const hasData = !!log && (log.totalCalories || 0) > 0;
      const consumed = log?.totalCalories || 0;
      return {
        label: dayLabels[d.getDay()],
        balance: hasData ? Math.round(consumed - calorieTarget) : 0,
        hasData,
        isToday: i === 13,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nutritionHistory, calorieTarget, isHe]);

  // ─── Journey to goal (start → now → target) ─────────────────
  // initialWeightDelta is the gap that existed when stats were first computed.
  // It only goes down over time, so it's a stable "starting line".
  // Fall back to current weightDelta if user just started (no history yet).
  const initialDelta = (progressionData?.initialWeightDelta && progressionData.initialWeightDelta > 0.1)
    ? progressionData.initialWeightDelta
    : Math.abs(weightDelta || 0.1);

  // Reconstruct start weight: if user needs to lose, start was heavier;
  // if needs to gain, start was lighter; if maintain, start = target.
  let startWeight;
  if (Math.abs(profile.weight - targetWeight) < 0.5) {
    startWeight = targetWeight;
  } else if (profile.weight > targetWeight) {
    startWeight = Math.round((targetWeight + initialDelta) * 10) / 10;
  } else {
    startWeight = Math.round((targetWeight - initialDelta) * 10) / 10;
  }

  // Snap edge cases: if user actually overshot (e.g. dropped below target on a cut),
  // clamp current to target so the marker doesn't fly off the track.
  const clampedCurrent = Math.max(
    Math.min(profile.weight, Math.max(startWeight, targetWeight)),
    Math.min(startWeight, targetWeight)
  );

  const journeyCovered = Math.abs(clampedCurrent - startWeight);
  const journeyTotal = Math.abs(targetWeight - startWeight) || 0.01;
  const journeyPct = Math.min(100, Math.round((journeyCovered / journeyTotal) * 100));

  // ─── Calorie balance summary ─────────────────────────────────
  const loggedDays = balanceDays.filter(d => d.hasData);
  const avgBalance = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.balance, 0) / loggedDays.length)
    : 0;

  const heroEyebrow = isHe ? 'מאזן אנרגטי · 14 ימים' : 'Energy balance · 14 days';
  let heroTitle, heroSub;
  const goalDir = profile?.goal === 'cut' ? 'cut' : profile?.goal === 'bulk' ? 'bulk' : 'maintain';

  if (loggedDays.length === 0) {
    heroTitle = isHe ? 'עדיין אין נתוני תזונה' : 'No nutrition data yet';
    heroSub = isHe
      ? 'התחל לרשום ארוחות כדי לראות את המאזן הקלוריות מול היעד.'
      : 'Log meals to see how your daily intake compares to your target.';
  } else if (goalDir === 'cut') {
    const aligned = avgBalance < 0;
    heroTitle = aligned
      ? (isHe ? `בגירעון ממוצע ${Math.abs(avgBalance)} קלוריות ביום` : `Average deficit of ${Math.abs(avgBalance)} kcal/day`)
      : (isHe ? `מעל היעד ב-${avgBalance} קלוריות ביום בממוצע` : `Avg ${avgBalance} kcal over target/day`);
    heroSub = aligned
      ? (isHe ? 'הקצב הזה תומך בירידה במשקל. תמשיך.' : 'This pace supports weight loss. Keep it up.')
      : (isHe ? 'כדי לרדת במשקל צריך גירעון. הקטן מנות או הוסף אימון.' : 'You need a deficit to lose weight. Smaller portions or more cardio.');
  } else if (goalDir === 'bulk') {
    const aligned = avgBalance > 0;
    heroTitle = aligned
      ? (isHe ? `בעודף ממוצע ${avgBalance} קלוריות ביום` : `Average surplus of ${avgBalance} kcal/day`)
      : (isHe ? `מתחת ליעד ב-${Math.abs(avgBalance)} קלוריות ביום בממוצע` : `Avg ${Math.abs(avgBalance)} kcal under target/day`);
    heroSub = aligned
      ? (isHe ? 'הקצב הזה תומך בעלייה במסה. תמשיך.' : 'This pace supports muscle gain. Keep it up.')
      : (isHe ? 'בלי עודף לא תעלה במסה. הוסף ארוחה או חטיף עתיר חלבון.' : 'Without a surplus, you won\'t gain. Add a meal or protein-rich snack.');
  } else {
    const aligned = Math.abs(avgBalance) < 200;
    heroTitle = aligned
      ? (isHe ? `יציב ביעד · ממוצע ${avgBalance > 0 ? '+' : ''}${avgBalance} קלוריות` : `Holding at target · avg ${avgBalance > 0 ? '+' : ''}${avgBalance} kcal`)
      : (isHe ? `סטייה של ${Math.abs(avgBalance)} קלוריות מהיעד` : `Off target by ${Math.abs(avgBalance)} kcal`);
    heroSub = aligned
      ? (isHe ? 'אתה שומר על המשקל. שמור על הקצב.' : 'You\'re maintaining. Keep this rhythm.')
      : (isHe ? 'נסה להישאר קרוב יותר ליעד היומי.' : 'Try to stay closer to your daily target.');
  }

  return (
    <>
      {!heroOnly && (
        <div className="page-header">
          <h1>{t.tabGoals}</h1>
          <p>{t.bmiAnalysis}</p>
        </div>
      )}

      {/* ─── Hero: Journey to goal — start → you → target ─────── */}
      <div className="forecast-card">
        <div className="forecast-card__header">
          <div>
            <div className="forecast-card__eyebrow">
              {isHe ? 'המסלול ליעד' : 'Journey to goal'}
            </div>
            <h2 className="forecast-card__title">
              {Math.abs(profile.weight - targetWeight) < 0.5
                ? (isHe ? 'הגעת ליעד 🎉' : 'You hit your goal 🎉')
                : journeyPct >= 50
                ? (isHe ? `יותר מחצי הדרך · ${journeyPct}%` : `More than halfway · ${journeyPct}%`)
                : journeyPct > 0
                ? (isHe ? `${journeyPct}% מהדרך` : `${journeyPct}% of the way`)
                : (isHe ? 'נקודת ההתחלה' : 'Starting line')}
            </h2>
            <div className="forecast-card__sub">
              {isHe
                ? `${journeyCovered.toFixed(1)} ק"ג עברת · נשארו ${(journeyTotal - journeyCovered).toFixed(1)} ק"ג ל-${targetWeight} ק"ג`
                : `${journeyCovered.toFixed(1)} kg covered · ${(journeyTotal - journeyCovered).toFixed(1)} kg left to ${targetWeight} kg`}
            </div>
          </div>
        </div>
        {/* Edge case: when start ≈ target (e.g. user is already at goal or
            "maintain" mode), the track collapses to a single point and the
            labels stack on top of each other. Show a celebratory summary +
            a CTA to pick the next goal instead. */}
        {Math.abs(startWeight - targetWeight) < 0.5 ? (
          <div style={{
            padding: '32px 20px',
            textAlign: 'center',
            background: 'rgba(34, 197, 94, 0.06)',
            border: '1px solid rgba(34, 197, 94, 0.18)',
            borderRadius: 'var(--r-md)',
            marginTop: 8,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--success, #22c55e)',
              marginBottom: 6,
            }}>
              {Math.abs(profile.weight - targetWeight) < 0.5
                ? (isHe ? 'הגעת ליעד שלך 🎉' : 'You hit your goal 🎉')
                : (isHe ? 'יעדך — שמירה על המשקל הנוכחי' : 'Your goal — maintain current weight')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              {isHe
                ? `המשקל הנוכחי: ${Math.round(profile.weight * 10) / 10} ק"ג. רוצה להמשיך הלאה?`
                : `Current weight: ${Math.round(profile.weight * 10) / 10} kg. Ready for what's next?`}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: 'auto', padding: '12px 22px', display: 'inline-flex' }}
              onClick={() => { setNewGoalChoice(null); setShowNewGoalModal(true); }}
            >
              {isHe ? '🎯 בחר יעד חדש' : '🎯 Pick a new goal'}
            </button>
          </div>
        ) : (
          <>
            {/* Horizontal chart on desktop, vertical on mobile (audit recommendation) */}
            <div className="journey-chart journey-chart--horizontal">
              <JourneyChart
                startWeight={startWeight}
                currentWeight={Math.round(profile.weight * 10) / 10}
                targetWeight={targetWeight}
                isHe={isHe}
              />
            </div>
            <div className="journey-chart journey-chart--vertical">
              <JourneyChartVertical
                startWeight={startWeight}
                currentWeight={Math.round(profile.weight * 10) / 10}
                targetWeight={targetWeight}
                isHe={isHe}
              />
            </div>
          </>
        )}
        {!progressionData?.initialWeightDelta && (
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 6, fontStyle: 'italic', textAlign: 'center' }}>
            {isHe
              ? 'נקודת ההתחלה תיקבע מהפעם הראשונה שהנתונים שלך יחושבו.'
              : 'Starting point locks in once your stats are first computed.'}
          </div>
        )}
      </div>

      {heroOnly ? null : (
      <>
      {/* ─── Supporting: 14-day energy balance ──────────────────
           Tells the "why" behind the journey: are your daily calories
           actually moving you toward the target? */}
      <div className="forecast-card">
        <div className="forecast-card__header">
          <div>
            <div className="forecast-card__eyebrow">{heroEyebrow}</div>
            <h2 className="forecast-card__title" style={{ fontSize: 20 }}>{heroTitle}</h2>
            <div className="forecast-card__sub">{heroSub}</div>
          </div>
          <div className="forecast-legend">
            <div className="forecast-legend__item">
              <span className="forecast-legend__swatch" style={{ background: '#2dd4bf' }} />
              {goalDir === 'cut'
                ? (isHe ? 'גירעון' : 'deficit')
                : goalDir === 'bulk'
                ? (isHe ? 'עודף' : 'surplus')
                : (isHe ? 'יציב' : 'on target')}
            </div>
            <div className="forecast-legend__item">
              <span className="forecast-legend__swatch" style={{ background: '#f59e0b' }} />
              {isHe ? 'מחוץ ליעד' : 'off-target'}
            </div>
            <div className="forecast-legend__item">
              <span className="forecast-legend__swatch" style={{ background: 'rgba(125,125,125,0.4)' }} />
              {isHe ? 'אין נתונים' : 'no data'}
            </div>
          </div>
        </div>
        <BalanceChart days={balanceDays} goal={goalDir} isHe={isHe} />
        <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8, fontStyle: 'italic' }}>
          {isHe
            ? `יעד יומי: ${calorieTarget.toLocaleString()} קלוריות · נתונים מ-${loggedDays.length} ימים שתועדו.`
            : `Daily target: ${calorieTarget.toLocaleString()} kcal · based on ${loggedDays.length} logged days.`}
        </div>
      </div>


      {/* ─── Goal recommendation (kept, restyled inline) ───────── */}
      {!isHealthy && !alreadyMatchesGoal && !applied && (
        <div className="card" style={{ background: style.bg, borderColor: style.border }}>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.6 }}>
            {needsLoss ? t.bmiNeedToLose : t.bmiNeedToGain}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--text-3)' }}>
              {t.bmiRecommendGoal}: <strong style={{ color: style.color }}>{t[goalLabelsMap[recommendedGoal]]}</strong>
            </span>
            <button
              onClick={handleApply}
              disabled={applying}
              className="btn btn-accent btn-sm"
              style={{ marginInlineStart: 'auto' }}
            >
              {applying ? t.saving : t.applyRecommendation}
            </button>
          </div>
        </div>
      )}
      {applied && (
        <div className="success-message">{t.bmiApplied}</div>
      )}

      {/* ─── Stats grid (current weight, target weight, healthy range, delta) ── */}
      <div className="card">
        <div className="card-header">
          <h3>{t.bmiAnalysis}</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>
              {profile.weight} {t.kg}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.currentWeight}</div>
          </div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
              {targetWeight} {t.kg}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.targetWeight}</div>
          </div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-2)' }}>
              {healthyRange.min}–{healthyRange.max} {t.kg}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.healthyWeightRange}</div>
          </div>
          {!isHealthy ? (
            <div style={{
              padding: 14,
              background: needsLoss ? 'rgba(239, 68, 68, 0.06)' : 'rgba(34, 197, 94, 0.06)',
              borderRadius: 'var(--r-md)',
              border: `1px solid ${needsLoss ? 'rgba(239, 68, 68, 0.20)' : 'rgba(34, 197, 94, 0.20)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: needsLoss ? 'var(--danger)' : 'var(--success)' }}>
                {Math.abs(weightDelta)} {t.kg}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {needsLoss ? t.weightToLose : t.weightToGain}
              </div>
            </div>
          ) : (
            <div style={{ padding: 14, background: 'rgba(34, 197, 94, 0.06)', borderRadius: 'var(--r-md)', border: '1px solid rgba(34, 197, 94, 0.20)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--success)' }}>
              ✓
            </div>
          )}
        </div>
      </div>

      {/* ─── BMI as supporting card (demoted from hero) ──────── */}
      <div className="support-card">
        <div className="support-card__title">
          <span>BMI</span>
          <span style={{
            marginInlineStart: 'auto',
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 99,
            background: style.bg,
            color: style.color,
            border: `1px solid ${style.border}`,
            fontWeight: 600,
          }}>
            {style.icon} {classLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, color: style.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {displayBmi}
          </div>
          {isSimulating && (
            <span style={{ fontSize: 12, color: 'var(--violet)' }}>
              ({t.simulatedWeight}: {simWeight} {t.kg})
            </span>
          )}
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
          {t.bmiSimulatorDesc}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'ltr' }}>
          <button
            type="button"
            onClick={() => {
              const w = displayWeight;
              if (w > 30) setSimWeight(Math.round((w - 0.5) * 10) / 10);
            }}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              border: `1.5px solid ${style.color}`, background: 'rgba(255,255,255,0.04)',
              color: style.color, fontSize: 16, fontWeight: 700, padding: 0, lineHeight: 1, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >−</button>
          <div
            ref={barRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            style={{
              height: 8,
              borderRadius: 4,
              background: 'linear-gradient(to right, #74b9ff 0%, #22c55e 20%, #22c55e 33%, #f59e0b 50%, #fb923c 67%, #ef4444 83%, #dc2626 100%)',
              position: 'relative',
              cursor: 'grab',
              flex: 1,
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute', top: '50%', left: `${gaugePos}%`,
                transform: 'translate(-50%, -50%)',
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--bg-0)',
                border: `2.5px solid ${style.color}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                cursor: 'grab',
                transition: dragging.current ? 'none' : 'left 0.15s ease',
                zIndex: 2,
              }}
            />
            <div style={{ position: 'absolute', top: -2, left: `${bmiToPercent(18.5)}%`, width: 1, height: 12, background: 'rgba(255,255,255,0.4)' }} />
            <div style={{ position: 'absolute', top: -2, left: `${bmiToPercent(25)}%`,   width: 1, height: 12, background: 'rgba(255,255,255,0.4)' }} />
          </div>
          <button
            type="button"
            onClick={() => {
              const w = displayWeight;
              if (w < 300) setSimWeight(Math.round((w + 0.5) * 10) / 10);
            }}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              border: `1.5px solid ${style.color}`, background: 'rgba(255,255,255,0.04)',
              color: style.color, fontSize: 16, fontWeight: 700, padding: 0, lineHeight: 1, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >+</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-4)', padding: '0 28px', direction: 'ltr' }}>
          <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>40+</span>
        </div>

        {isSimulating && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              onClick={() => setSimWeight(null)}
              style={{
                padding: '4px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-3)',
                fontSize: 11,
              }}
            >
              {isHe ? 'חזור למשקל הנוכחי' : 'Reset to current weight'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Plan details (only if not healthy) ──────────────── */}
      {!isHealthy && (
        <div className="support-card">
          <div className="support-card__title">{t.bmiRecommendation}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.weeklyRate}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--violet)' }}>
                {weeklyRate} {t.kgPerWeekRate}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.estimatedTime}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--violet)' }}>
                {months > 0 ? `~${months} ${t.months}` : `${weeksToTarget} ${t.weeks}`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                {needsLoss ? t.dailyDeficit : t.dailySurplus}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: needsLoss ? 'var(--danger)' : 'var(--success)' }}>
                {needsLoss ? '-' : '+'}{dailyCalorieAdjustment} {t.kcal}
              </span>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* New-goal picker — opens from the "you hit your goal" celebration */}
      {showNewGoalModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isHe ? 'בחר יעד חדש' : 'Pick a new goal'}
          onClick={() => !savingNewGoal && setShowNewGoalModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10, 14, 26, 0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 10000,
            animation: 'fadeIn 0.18s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl)',
              width: '100%', maxWidth: 440,
              padding: 28,
              boxShadow: 'var(--shadow-3)',
            }}
          >
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24, fontWeight: 700, margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}>
              {isHe ? 'מה הלאה?' : 'What’s next?'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 20px', lineHeight: 1.55 }}>
              {isHe
                ? 'הגעת ליעד הנוכחי שלך. בחר את הכיוון הבא — נחדש את חישוב הקלוריות, המאקרו והתוכנית.'
                : 'You reached your current goal. Pick your next direction — we’ll re-tune calories, macros, and your plan.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { value: 'cut',      icon: '🔥',  label: t.goalCut,      desc: t.goalCutDesc,      accent: '#f59e0b' },
                { value: 'bulk',     icon: '💪',  label: t.goalBulk,     desc: t.goalBulkDesc,     accent: '#2dd4bf' },
                { value: 'maintain', icon: '⚖️', label: t.goalMaintain, desc: t.goalMaintainDesc, accent: '#8b5cf6' },
              ].map((g) => {
                const sel = newGoalChoice === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setNewGoalChoice(g.value)}
                    disabled={savingNewGoal}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px',
                      borderRadius: 'var(--r-md)',
                      border: `1.5px solid ${sel ? g.accent : 'var(--border)'}`,
                      background: sel ? `linear-gradient(135deg, ${g.accent}1f, ${g.accent}08)` : 'var(--bg-input)',
                      boxShadow: sel ? `0 0 0 3px ${g.accent}22` : 'none',
                      color: 'var(--text-1)',
                      cursor: 'pointer',
                      textAlign: isHe ? 'right' : 'left',
                      fontFamily: 'inherit',
                      minHeight: 60,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 26, lineHeight: 1 }}>{g.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{g.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{g.desc}</div>
                    </div>
                    {sel && <span style={{ color: g.accent, fontSize: 20, fontWeight: 800 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {newGoalError && (
              <div className="error-message" style={{ marginTop: 14 }}>{newGoalError}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowNewGoalModal(false)}
                disabled={savingNewGoal}
                style={{ flex: '0 0 auto' }}
              >
                {isHe ? 'ביטול' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSetNewGoal}
                disabled={!newGoalChoice || savingNewGoal}
                style={{ flex: 1 }}
              >
                {savingNewGoal
                  ? (isHe ? 'מעדכן…' : 'Updating…')
                  : (isHe ? 'אשר ועדכן את התוכנית' : 'Confirm and update plan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
