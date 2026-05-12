import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

function calcBMI(weight, heightCm) {
  if (!weight || !heightCm || heightCm < 100) return null;
  const m = heightCm / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}

function classifyBMI(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obese1';
  if (bmi < 40) return 'obese2';
  return 'obese3';
}

const classColors = {
  underweight: { color: '#74b9ff', bg: 'rgba(116,185,255,0.12)', border: 'rgba(116,185,255,0.3)', icon: '🔵' },
  normal: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: '🟢' },
  overweight: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '🟡' },
  obese1: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', icon: '🟠' },
  obese2: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: '🔴' },
  obese3: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)', icon: '🔴' },
};

const classGoalMap = {
  underweight: 'bulk',
  normal: 'maintain',
  overweight: 'cut',
  obese1: 'cut',
  obese2: 'cut',
  obese3: 'cut',
};

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function ArrowIcon({ flip = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}

export default function Onboarding() {
  const { t, lang, setLanguage } = useLang();
  const isHe = lang === 'he';
  const [form, setForm] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: 'male',
    goal: '',
    workoutsPerWeek: '4',
    experience: '',
    bodyFatPercentage: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { api, updateUser, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const bmi = useMemo(() => calcBMI(parseFloat(form.weight), parseFloat(form.height)), [form.weight, form.height]);
  const bmiClass = bmi ? classifyBMI(bmi) : null;
  const bmiStyle = bmiClass ? classColors[bmiClass] : null;
  const recommendedGoal = bmiClass ? classGoalMap[bmiClass] : null;
  const gaugePos = bmi ? Math.min(100, Math.max(0, ((bmi - 15) / 30) * 100)) : 0;

  const classLabelsHe = { underweight: 'תת משקל', normal: 'משקל תקין', overweight: 'עודף משקל', obese1: 'השמנה I', obese2: 'השמנה II', obese3: 'השמנה III' };
  const classLabelsEn = { underweight: 'Underweight', normal: 'Normal', overweight: 'Overweight', obese1: 'Obese I', obese2: 'Obese II', obese3: 'Obese III' };
  const classLabels = isHe ? classLabelsHe : classLabelsEn;

  const goalLabelsMap = { bulk: t.goalBulk, cut: t.goalCut, maintain: t.goalMaintain };

  // Goal cards mapped to the design (icon, color accent, descriptive sub)
  const goals = [
    { value: 'cut',      icon: '🔥',  label: t.goalCut,      desc: t.goalCutDesc,      accent: '#f59e0b' },
    { value: 'bulk',     icon: '💪',  label: t.goalBulk,     desc: t.goalBulkDesc,     accent: '#2dd4bf' },
    { value: 'maintain', icon: '⚖️', label: t.goalMaintain, desc: t.goalMaintainDesc, accent: '#8b5cf6' },
  ];

  const experienceLevels = [
    { value: 'beginner',     label: t.expBeginner,     desc: t.expBeginnerDesc },
    { value: 'intermediate', label: t.expIntermediate, desc: t.expIntermediateDesc },
    { value: 'advanced',     label: t.expAdvanced,     desc: t.expAdvancedDesc },
  ];

  // Derived form-completion progress (drives the 4-step bar visual)
  const completion = useMemo(() => {
    const s1 = form.name.trim() ? 1 : 0;
    const s2 = form.goal ? 1 : 0;
    const s3 = (form.height && form.weight && form.age) ? 1 : 0;
    const s4 = form.experience ? 1 : 0;
    return { s1, s2, s3, s4, total: s1 + s2 + s3 + s4 };
  }, [form]);

  const stepLabels = isHe
    ? ['אתה', 'מטרה', 'גוף', 'תוכנית']
    : ['You', 'Goal', 'Body', 'Plan'];

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Auto-pick the app language based on the script of the user's name.
    // Hebrew letters → 'he', Latin letters → 'en'. Reacts to live edits so
    // typing "John" then clearing and typing "יוסי" properly flips back.
    if (field === 'name') {
      const trimmed = (value || '').trim();
      if (trimmed.length >= 2) {
        const hasHebrew = /[֐-׿]/.test(trimmed);
        const hasLatin  = /[A-Za-z]/.test(trimmed);
        const detected = hasHebrew ? 'he' : hasLatin ? 'en' : null;
        if (detected && detected !== lang) setLanguage(detected);
      }
    }
  }

  function applyBmiGoal() {
    if (recommendedGoal) updateField('goal', recommendedGoal);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.age || !form.height || !form.weight || !form.goal || !form.experience) {
      setError(t.fillRequired);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        age: parseInt(form.age),
        height: parseFloat(form.height),
        weight: parseFloat(form.weight),
        gender: form.gender,
        goal: form.goal,
        workoutsPerWeek: parseInt(form.workoutsPerWeek),
        experience: form.experience,
      };
      if (form.bodyFatPercentage) {
        payload.bodyFatPercentage = parseFloat(form.bodyFatPercentage);
      }

      await api('/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      updateUser({ onboardingComplete: true });
      await fetchProfile();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Header: brand + skip placeholder for symmetry */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div className="brand">
            <div className="brand__mark" aria-label="Areto">A</div>
            <div className="brand__name">{t.appName}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            {isHe ? 'הגדרת חשבון' : 'Account setup'}
          </span>
        </div>

        {/* Step progress (driven by real completion) */}
        <div className="step-progress">
          <div className="step-progress__label">
            <span className="step-progress__step">
              {isHe
                ? `שלב ${completion.total} מתוך 4`
                : `Step ${completion.total} of 4`}
            </span>
            <span className="step-progress__pct">{(completion.total / 4 * 100).toFixed(0)}%</span>
          </div>
          <div className="step-progress__bars">
            {[completion.s1, completion.s2, completion.s3, completion.s4].map((done, i) => (
              <div key={i} className={`step-progress__bar${done ? ' step-progress__bar--done' : ''}`} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 10, fontSize: 11, fontWeight: 500 }}>
            {stepLabels.map((label, i) => {
              const done = [completion.s1, completion.s2, completion.s3, completion.s4][i];
              return (
                <span key={i} style={{ color: done ? 'var(--accent)' : 'var(--text-4)' }}>
                  {done ? '✓' : '●'} {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Hero question */}
        <div style={{ marginBottom: 28 }}>
          <h1>{t.onboardingTitle}</h1>
          <p className="subtitle">{t.onboardingSubtitle}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* ── Section 1: You ───────────────────────────── */}
          <div className="section-pill">
            {isHe ? '01 · אתה' : '01 · You'}
          </div>

          <div className="form-group">
            <label>{t.nameLabel}</label>
            <input
              type="text"
              placeholder={t.namePlaceholder}
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              maxLength={50}
              dir="auto"
            />
          </div>

          <div className="form-group">
            <label>{t.gender}</label>
            <select value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
              <option value="male">{t.male}</option>
              <option value="female">{t.female}</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t.age}</label>
              <input type="number" placeholder="25" value={form.age} onChange={(e) => updateField('age', e.target.value)} min="13" max="120" />
            </div>
            <div className="form-group">
              <label>{t.heightLabel}</label>
              <input type="number" placeholder="175" value={form.height} onChange={(e) => updateField('height', e.target.value)} min="100" max="250" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t.weightLabel}</label>
              <input type="number" placeholder="75" value={form.weight} onChange={(e) => updateField('weight', e.target.value)} min="30" max="300" step="0.1" />
            </div>
            <div className="form-group">
              <label>{t.bodyFat}</label>
              <input type="number" placeholder="15" value={form.bodyFatPercentage} onChange={(e) => updateField('bodyFatPercentage', e.target.value)} min="3" max="60" step="0.1" />
            </div>
          </div>

          {/* BMI gauge — kept functional, retuned visually */}
          {bmi && bmiStyle && (
            <div style={{
              padding: 18,
              borderRadius: 'var(--r-md)',
              background: bmiStyle.bg,
              border: `1px solid ${bmiStyle.border}`,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: bmiStyle.color, letterSpacing: '-0.02em' }}>
                    {bmi}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>BMI</span>
                </div>
                <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', color: bmiStyle.color, border: `1px solid ${bmiStyle.border}`, fontWeight: 600 }}>
                  {bmiStyle.icon} {classLabels[bmiClass]}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, direction: 'ltr' }}>
                <button
                  type="button"
                  onClick={() => {
                    const w = parseFloat(form.weight) || 0;
                    if (w > 30) updateField('weight', String(Math.round((w - 0.5) * 10) / 10));
                  }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `1.5px solid ${bmiStyle.color}`, background: 'rgba(255,255,255,0.04)',
                    color: bmiStyle.color, fontSize: 18, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, lineHeight: 1, flexShrink: 0,
                  }}
                >−</button>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{
                    height: 8,
                    borderRadius: 4,
                    background: 'linear-gradient(to right, #74b9ff 0%, #22c55e 20%, #22c55e 33%, #f59e0b 50%, #fb923c 67%, #ef4444 83%, #dc2626 100%)',
                  }} />
                  <div style={{
                    position: 'absolute', top: '50%', left: `${gaugePos}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 18, height: 18,
                    borderRadius: '50%',
                    background: 'var(--bg-0)',
                    border: `2.5px solid ${bmiStyle.color}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    transition: 'left 0.3s ease',
                  }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const w = parseFloat(form.weight) || 0;
                    if (w < 300) updateField('weight', String(Math.round((w + 0.5) * 10) / 10));
                  }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `1.5px solid ${bmiStyle.color}`, background: 'rgba(255,255,255,0.04)',
                    color: bmiStyle.color, fontSize: 18, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, lineHeight: 1, flexShrink: 0,
                  }}
                >+</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-4)', direction: 'ltr' }}>
                <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>40+</span>
              </div>

              {recommendedGoal && (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {t.bmiRecommendGoal}: <strong style={{ color: bmiStyle.color }}>{goalLabelsMap[recommendedGoal]}</strong>
                  </span>
                  {form.goal !== recommendedGoal && (
                    <button
                      type="button"
                      onClick={applyBmiGoal}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        border: `1px solid ${bmiStyle.color}`,
                        background: 'rgba(255,255,255,0.04)',
                        color: bmiStyle.color,
                        fontSize: 12, fontWeight: 600,
                      }}
                    >
                      {t.applyRecommendation}
                    </button>
                  )}
                  {form.goal === recommendedGoal && (
                    <span style={{ fontSize: 14, color: bmiStyle.color, fontWeight: 700 }}>✓</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Section 2: Goal ──────────────────────────── */}
          <div className="section-pill" style={{ marginTop: 12 }}>
            {isHe ? '02 · מטרה' : '02 · Goal'}
          </div>

          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              {isHe ? 'מה המטרה שלך?' : 'What’s your goal?'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
              {isHe ? 'נבנה תוכנית אימון ותזונה מדויקת לפי הבחירה. תוכל לשנות בכל זמן.' : 'We’ll build a precise training and nutrition plan. You can change it anytime.'}
            </p>
          </div>

          <div className="goal-options">
            {goals.map((g) => {
              const sel = form.goal === g.value;
              const isRecommended = recommendedGoal === g.value && !sel;
              return (
                <button
                  key={g.value}
                  type="button"
                  className={`goal-option${sel ? ' selected' : ''}`}
                  onClick={() => updateField('goal', g.value)}
                  style={isRecommended && bmiStyle ? {
                    borderColor: bmiStyle.color,
                    boxShadow: `0 0 0 3px ${bmiStyle.color}22`,
                  } : sel ? {
                    borderColor: g.accent,
                    background: `linear-gradient(180deg, ${g.accent}1f, ${g.accent}08)`,
                    boxShadow: `0 0 0 4px ${g.accent}15`,
                  } : {}}
                >
                  {sel && (
                    <div className="goal-option__check" style={{ background: g.accent }}>
                      <CheckIcon />
                    </div>
                  )}
                  <div className="goal-icon">{g.icon}</div>
                  <div className="goal-label">{g.label}</div>
                  <div className="goal-desc">{g.desc}</div>
                  {isRecommended && (
                    <span style={{ fontSize: 11, color: bmiStyle?.color, fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {isHe ? '← מומלץ' : 'Recommended'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {recommendedGoal && (
            <div className="rec-note">
              <div className="rec-note__icon">💡</div>
              <div>
                <strong style={{ color: 'var(--accent)' }}>
                  {isHe ? 'על בסיס הנתונים שלך' : 'Based on your stats'}
                </strong>
                {' — '}
                {bmi && (
                  <>
                    BMI {bmi}
                    {form.height && `, ${isHe ? 'גובה' : 'height'} ${form.height}`}
                    {form.age && `, ${isHe ? 'גיל' : 'age'} ${form.age}`}
                    {' — '}
                  </>
                )}
                {isHe ? 'אנחנו ממליצים על' : 'we recommend'}{' '}
                <strong style={{ color: 'var(--text-1)' }}>{goalLabelsMap[recommendedGoal]}</strong>.
              </div>
            </div>
          )}

          {/* ── Section 3: Plan ──────────────────────────── */}
          <div className="section-pill" style={{ marginTop: 24 }}>
            {isHe ? '03 · תוכנית' : '03 · Plan'}
          </div>

          <div className="form-group">
            <label>{t.workoutsPerWeek}</label>
            <select value={form.workoutsPerWeek} onChange={(e) => updateField('workoutsPerWeek', e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n} {t.workoutsUnit}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t.experienceLabel}</label>
          </div>
          <div className="goal-options" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {experienceLevels.map((exp) => {
              const sel = form.experience === exp.value;
              return (
                <button
                  key={exp.value}
                  type="button"
                  className={`goal-option${sel ? ' selected' : ''}`}
                  onClick={() => updateField('experience', exp.value)}
                  style={{ padding: '18px 16px' }}
                >
                  {sel && (
                    <div className="goal-option__check"><CheckIcon /></div>
                  )}
                  <div className="goal-label" style={{ fontSize: 16 }}>{exp.label}</div>
                  <div className="goal-desc">{exp.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary-cta" disabled={loading} style={{ marginTop: 28 }}>
            <span>{loading ? t.saving : t.startJourney}</span>
            <ArrowIcon flip={!isHe} />
          </button>
        </form>
      </div>
    </div>
  );
}
