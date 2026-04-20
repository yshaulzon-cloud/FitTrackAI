import { useState } from 'react';
import { useLang } from '../context/LanguageContext';

export default function NutritionTracker({ targets, todayData, api, onUpdate }) {
  const { t, lang } = useLang();
  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  async function handleAddFood(e) {
    e.preventDefault();
    if (!foodInput.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      const result = await api('/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({ description: foodInput.trim() }),
      });
      setFoodInput('');
      const aiTag = result.meal.source === 'ai' ? ` 🤖 ${t.aiEstimate}` : '';
      setMessage(
        `${t.added} ${result.meal.description} (${result.meal.calories} ${t.caloriesWord}, ${result.meal.protein} ${t.proteinGrams})${aiTag}`
      );
      setTimeout(() => setMessage(''), 4000);
      onUpdate();
    } catch (err) {
      setMessage(t.errorSaving);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMeal(mealId) {
    setDeletingId(mealId);
    try {
      await api(`/nutrition/meal/${mealId}`, { method: 'DELETE' });
      setMessage(t.mealDeleted);
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (err) {
      setMessage(t.errorDeleting);
    } finally {
      setDeletingId(null);
    }
  }

  const calorieTarget = targets?.calorieTarget || 2000;
  const proteinTarget = targets?.macros?.protein || 150;
  const carbsTarget = targets?.macros?.carbs || 250;
  const fatTarget = targets?.macros?.fat || 65;
  const fiberTarget = targets?.macros?.fiberTarget || 30;

  const macroItems = [
    { label: t.calories, current: todayData?.totalCalories || 0, target: calorieTarget, unit: t.kcal, cls: 'calories', color: 'var(--warning)' },
    { label: t.protein, current: todayData?.totalProtein || 0, target: proteinTarget, unit: t.grams, cls: 'protein', color: 'var(--accent)' },
    { label: t.carbs, current: todayData?.totalCarbs || 0, target: carbsTarget, unit: t.grams, cls: 'carbs', color: 'var(--primary-light)' },
    { label: t.fat, current: todayData?.totalFat || 0, target: fatTarget, unit: t.grams, cls: 'fat', color: 'var(--danger)' },
    { label: t.fiber, current: todayData?.totalFiber || 0, target: fiberTarget, unit: t.grams, cls: 'protein', color: 'var(--success)' },
  ];

  const isError = message === t.errorSaving || message === t.errorDeleting;

  return (
    <>
      <div className="page-header">
        <h1>{t.nutritionTracking}</h1>
        <p>{t.nutritionSubtitle}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.addMeal}</h3>
        </div>
        <form onSubmit={handleAddFood}>
          <div className="food-input-container">
            <input
              type="text"
              placeholder={t.foodPlaceholder}
              value={foodInput}
              onChange={(e) => setFoodInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-accent" disabled={loading || !foodInput.trim()}>
              {loading ? t.saving : t.add}
            </button>
          </div>
        </form>

        {message && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: isError
                ? 'rgba(255,107,107,0.1)'
                : 'rgba(0,184,148,0.1)',
              color: isError ? 'var(--danger)' : 'var(--success)',
              fontSize: '14px',
              marginTop: '8px',
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          {t.dbInfo}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t.dailySummary}</h3>
        </div>

        <div className="stats-grid">
          {macroItems.slice(0, 4).map((item) => (
            <div className={`stat-card ${item.cls}`} key={item.label}>
              <div className="stat-value">{item.current}{item.unit !== t.kcal ? ' ' + item.unit : ''}</div>
              <div className="stat-label">{t.outOf} {item.target} {item.unit} {item.label}</div>
            </div>
          ))}
        </div>

        {macroItems.map((item) => (
          <div className="progress-container" key={item.label}>
            <div className="progress-label">
              <span>{item.label}</span>
              <span>
                {item.current} / {item.target} {item.unit} ({Math.round((item.current / (item.target || 1)) * 100)}%)
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${item.cls}`}
                style={{
                  width: `${Math.min(100, (item.current / (item.target || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {targets?.macros?.proteinPerMeal && (
        <div
          className="card"
          style={{
            background: 'rgba(0, 206, 201, 0.05)',
            borderColor: 'rgba(0, 206, 201, 0.2)',
          }}
        >
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent)' }}>{t.optimalProtein}</strong>{' '}
            {targets.macros.proteinPerMeal} {t.proteinPerMealTip} {targets.macros.mealsPerDay} {t.mealsPerDay},{' '}
            {t.mealInterval}
          </div>
        </div>
      )}

      {todayData?.meals?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>{t.todayMeals}</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {todayData.meals.length} {t.meals}
            </span>
          </div>
          <div className="meal-log">
            {todayData.meals.map((meal, idx) => (
              <div key={meal._id || idx} className="meal-item" style={{ alignItems: 'center' }}>
                <span className="meal-desc">
                  {lang === 'en' && meal.englishName ? meal.englishName : meal.description}
                  {meal.source === 'ai' && (
                    <span
                      style={{
                        marginRight: lang === 'he' ? '6px' : '0',
                        marginLeft: lang === 'en' ? '6px' : '0',
                        fontSize: '11px',
                        background: 'rgba(108, 92, 231, 0.15)',
                        color: 'var(--primary-light)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        verticalAlign: 'middle',
                      }}
                    >
                      🤖 AI
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="meal-macros">
                    <span style={{ color: 'var(--warning)' }}>{meal.calories} {t.kcal}</span>
                    <span style={{ color: 'var(--accent)' }}>{meal.protein} {t.protein}</span>
                    <span style={{ color: 'var(--primary-light)' }}>{meal.carbs} {t.carbsShort}</span>
                    <span style={{ color: 'var(--danger)' }}>{meal.fat} {t.fat}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteMeal(meal._id)}
                    disabled={deletingId === meal._id}
                    style={{
                      background: 'rgba(255,107,107,0.1)',
                      color: 'var(--danger)',
                      border: '1px solid rgba(255,107,107,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      opacity: deletingId === meal._id ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {deletingId === meal._id ? '...' : t.deleteMeal}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
