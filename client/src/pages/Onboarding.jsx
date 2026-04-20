import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Onboarding() {
  const { t } = useLang();
  const [form, setForm] = useState({
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

  const goals = [
    { value: 'bulk', icon: '💪', label: t.goalBulk, desc: t.goalBulkDesc },
    { value: 'cut', icon: '🔥', label: t.goalCut, desc: t.goalCutDesc },
    { value: 'maintain', icon: '⚖️', label: t.goalMaintain, desc: t.goalMaintainDesc },
  ];

  const experienceLevels = [
    { value: 'beginner', label: t.expBeginner, desc: t.expBeginnerDesc },
    { value: 'intermediate', label: t.expIntermediate, desc: t.expIntermediateDesc },
    { value: 'advanced', label: t.expAdvanced, desc: t.expAdvancedDesc },
  ];

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.age || !form.height || !form.weight || !form.goal || !form.experience) {
      setError(t.fillRequired);
      return;
    }

    setLoading(true);
    try {
      const payload = {
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
        <h1>{t.onboardingTitle}</h1>
        <p className="subtitle">{t.onboardingSubtitle}</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
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
              <input
                type="number"
                placeholder="25"
                value={form.age}
                onChange={(e) => updateField('age', e.target.value)}
                min="13"
                max="120"
              />
            </div>
            <div className="form-group">
              <label>{t.heightLabel}</label>
              <input
                type="number"
                placeholder="175"
                value={form.height}
                onChange={(e) => updateField('height', e.target.value)}
                min="100"
                max="250"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t.weightLabel}</label>
              <input
                type="number"
                placeholder="75"
                value={form.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                min="30"
                max="300"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>{t.bodyFat}</label>
              <input
                type="number"
                placeholder="15"
                value={form.bodyFatPercentage}
                onChange={(e) => updateField('bodyFatPercentage', e.target.value)}
                min="3"
                max="60"
                step="0.1"
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t.goalLabel}</label>
          </div>
          <div className="goal-options">
            {goals.map((g) => (
              <div
                key={g.value}
                className={`goal-option ${form.goal === g.value ? 'selected' : ''}`}
                onClick={() => updateField('goal', g.value)}
              >
                <span className="goal-icon">{g.icon}</span>
                <span className="goal-label">{g.label}</span>
                <span className="goal-desc">{g.desc}</span>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>{t.workoutsPerWeek}</label>
            <select
              value={form.workoutsPerWeek}
              onChange={(e) => updateField('workoutsPerWeek', e.target.value)}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} {t.workoutsUnit}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t.experienceLabel}</label>
          </div>
          <div className="goal-options">
            {experienceLevels.map((exp) => (
              <div
                key={exp.value}
                className={`goal-option ${form.experience === exp.value ? 'selected' : ''}`}
                onClick={() => updateField('experience', exp.value)}
              >
                <span className="goal-label">{exp.label}</span>
                <span className="goal-desc">{exp.desc}</span>
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t.saving : t.startJourney}
          </button>
        </form>
      </div>
    </div>
  );
}
