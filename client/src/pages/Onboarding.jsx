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
  const [currentStep, setCurrentStep] = useState(1);
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

  const stepLabels = isHe
    ? ['אתה', 'גוף', 'מטרה', 'תוכנית']
    : ['You', 'Body', 'Goal', 'Plan'];

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));

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

  // Per-step validation. The Next button is disabled until the current step's
  // required fields are filled.
  function isStepValid(step) {
    if (step === 1) return form.name.trim().length >= 2 && form.age && parseInt(form.age) >= 13;
    if (step === 2) return form.height && form.weight && parseFloat(form.height) >= 100 && parseFloat(form.weight) >= 30;
    if (step === 3) return Boolean(form.goal);
    if (step === 4) return Boolean(form.experience) && form.workoutsPerWeek;
    return false;
  }

  const canProceed = isStepValid(currentStep);

  function goNext() {
    if (!canProceed) return;
    setError('');
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  }

  function goBack() {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit() {
    setError('');

    if (!isStepValid(1) || !isStepValid(2) || !isStepValid(3) || !isStepValid(4)) {
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
      <div className="onboarding-card onboarding-wizard">
        {/* Header: brand + step counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="brand">
            <div className="brand__mark" aria-label="Areto">A</div>
            <div className="brand__name">{t.appName}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            {isHe ? `שלב ${currentStep} מתוך 4` : `Step ${currentStep} of 4`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="wizard-progress" aria-label={`Step ${currentStep} of 4`}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`wizard-progress__bar${s <= currentStep ? ' wizard-progress__bar--done' : ''}`}
            />
          ))}
        </div>
        <div className="wizard-progress__labels">
          {stepLabels.map((label, i) => (
            <span
              key={i}
              className={`wizard-progress__label${i + 1 === currentStep ? ' wizard-progress__label--active' : ''}${i + 1 < currentStep ? ' wizard-progress__label--done' : ''}`}
            >
              {i + 1 < currentStep ? '✓ ' : ''}{label}
            </span>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* === STEP 1: YOU === */}
        {currentStep === 1 && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">
              {isHe ? 'בוא נכיר אותך' : 'Let’s meet you'}
            </h1>
            <p className="wizard-step__sub">
              {isHe ? 'נתחיל מהבסיס — שם, גיל, ומין.' : 'We’ll start with the basics — name, age, and sex.'}
            </p>

            <div className="form-group">
              <label>{t.nameLabel}</label>
              <input
                className="field-input"
                type="text"
                placeholder={t.namePlaceholder}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                maxLength={50}
                autoComplete="name"
                autoFocus
                dir="auto"
              />
            </div>

            <div className="form-group">
              <label>{t.gender}</label>
              <div className="toggle-row" role="radiogroup" aria-label={t.gender}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.gender === 'male'}
                  className={`toggle-row__btn${form.gender === 'male' ? ' toggle-row__btn--active' : ''}`}
                  onClick={() => updateField('gender', 'male')}
                >
                  <span style={{ fontSize: 20 }}>👨</span> {t.male}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.gender === 'female'}
                  className={`toggle-row__btn${form.gender === 'female' ? ' toggle-row__btn--active' : ''}`}
                  onClick={() => updateField('gender', 'female')}
                >
                  <span style={{ fontSize: 20 }}>👩</span> {t.female}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>{t.age}</label>
              <input
                className="field-input"
                type="number"
                inputMode="numeric"
                placeholder="25"
                value={form.age}
                onChange={(e) => updateField('age', e.target.value)}
                min="13"
                max="120"
              />
            </div>
          </div>
        )}

        {/* === STEP 2: BODY === */}
        {currentStep === 2 && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">
              {isHe ? 'הגוף שלך' : 'Your body'}
            </h1>
            <p className="wizard-step__sub">
              {isHe ? 'גובה ומשקל — בשביל לחשב מטרות מדויקות. אחוזי שומן אופציונלי.' : 'Height and weight let us set accurate targets. Body fat is optional.'}
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>{t.heightLabel}</label>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="175"
                  value={form.height}
                  onChange={(e) => updateField('height', e.target.value)}
                  min="100"
                  max="250"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>{t.weightLabel}</label>
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="75"
                  value={form.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                  min="30"
                  max="300"
                  step="0.1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t.bodyFat} <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>({isHe ? 'לא חובה' : 'optional'})</span></label>
              <input
                className="field-input"
                type="number"
                inputMode="decimal"
                placeholder="15"
                value={form.bodyFatPercentage}
                onChange={(e) => updateField('bodyFatPercentage', e.target.value)}
                min="3"
                max="60"
                step="0.1"
              />
            </div>

            {/* BMI gauge — visible once we have both height + weight */}
            {bmi && bmiStyle && (
              <div style={{
                padding: 18,
                borderRadius: 'var(--r-md)',
                background: bmiStyle.bg,
                border: `1px solid ${bmiStyle.border}`,
                marginTop: 8,
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

                <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'linear-gradient(to right, #74b9ff 0%, #22c55e 20%, #22c55e 33%, #f59e0b 50%, #fb923c 67%, #ef4444 83%, #dc2626 100%)', direction: 'ltr' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-4)', direction: 'ltr', marginTop: 6 }}>
                  <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>40+</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === STEP 3: GOAL === */}
        {currentStep === 3 && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">
              {isHe ? 'מה המטרה שלך?' : 'What’s your goal?'}
            </h1>
            <p className="wizard-step__sub">
              {isHe ? 'נבנה תוכנית אימון ותזונה לפי הבחירה. תוכל לשנות בכל זמן.' : 'We’ll tailor the plan. You can change it anytime.'}
            </p>

            <div className="goal-options goal-options--stack">
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
              <div className="rec-note" style={{ marginTop: 12 }}>
                <div className="rec-note__icon">💡</div>
                <div>
                  <strong style={{ color: 'var(--accent)' }}>
                    {isHe ? 'על בסיס הנתונים שלך' : 'Based on your stats'}
                  </strong>
                  {' — '}
                  {bmi && (
                    <>BMI {bmi} — </>
                  )}
                  {isHe ? 'אנחנו ממליצים על' : 'we recommend'}{' '}
                  <strong style={{ color: 'var(--text-1)' }}>{goalLabelsMap[recommendedGoal]}</strong>.
                  {form.goal !== recommendedGoal && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={applyBmiGoal}
                        className="link-action"
                      >
                        {t.applyRecommendation}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === STEP 4: PLAN === */}
        {currentStep === 4 && (
          <div className="wizard-step">
            <h1 className="wizard-step__title">
              {isHe ? 'תוכנית האימונים שלך' : 'Your training plan'}
            </h1>
            <p className="wizard-step__sub">
              {isHe ? 'כמה אימונים בשבוע ובאיזו רמה — נבנה תוכנית מתאימה.' : 'How often and at what level — we’ll match the plan.'}
            </p>

            <div className="form-group">
              <label>{t.workoutsPerWeek}</label>
              <div className="chip-row" role="radiogroup" aria-label={t.workoutsPerWeek}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={form.workoutsPerWeek === String(n)}
                    className={`chip-row__chip${form.workoutsPerWeek === String(n) ? ' chip-row__chip--active' : ''}`}
                    onClick={() => updateField('workoutsPerWeek', String(n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
                {form.workoutsPerWeek} {t.workoutsUnit}
              </div>
            </div>

            <div className="form-group">
              <label>{t.experienceLabel}</label>
              <div className="goal-options goal-options--stack">
                {experienceLevels.map((exp) => {
                  const sel = form.experience === exp.value;
                  return (
                    <button
                      key={exp.value}
                      type="button"
                      className={`goal-option${sel ? ' selected' : ''}`}
                      onClick={() => updateField('experience', exp.value)}
                      style={{ padding: '18px 16px', minHeight: 64 }}
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
            </div>
          </div>
        )}

        {/* Sticky bottom navigation bar — Back + Next/Submit */}
        <div className="wizard-nav">
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn btn-ghost wizard-nav__back"
              onClick={goBack}
              disabled={loading}
            >
              <ArrowIcon flip={isHe} />
              <span>{isHe ? 'חזרה' : 'Back'}</span>
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            className="btn btn-primary cta-sticky"
            onClick={goNext}
            disabled={!canProceed || loading}
          >
            <span>
              {loading ? t.saving : currentStep === 4 ? t.startJourney : (isHe ? 'המשך' : 'Continue')}
            </span>
            <ArrowIcon flip={!isHe} />
          </button>
        </div>
      </div>
    </div>
  );
}
