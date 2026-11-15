import { useState } from 'react';
import { validateManualMeal, manualErrorText } from '../lib/manualMeal.mjs';

const inputStyle = {
  width: '100%', minHeight: 44, boxSizing: 'border-box', padding: '8px 12px',
  borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-1)', fontFamily: 'inherit', fontSize: 16,
};
const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 };

// Shown when the typed food is not in the database: the app does not guess, so the
// user can type the numbers themselves (from a package label, say). Nothing is sent
// until they tap Save; the numbers are validated here and again by the server.
export default function ManualMealForm({ isHe, initialName = '', busy = false, serverError = '', onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: initialName, calories: '', protein: '', carbs: '', fat: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const r = validateManualMeal(form);
    if (!r.ok) { setErrors(r.errors); return; }
    setErrors({});
    onSubmit({ description: r.description, nutrition: r.nutrition });
  }

  const num = (key, label, unit, required) => (
    <div style={{ flex: '1 1 40%', minWidth: 110 }}>
      <label style={labelStyle} htmlFor={`mm-${key}`}>{label}{required ? ' *' : ''}</label>
      <input
        id={`mm-${key}`} type="text" inputMode="decimal" dir="ltr" autoComplete="off"
        value={form[key]} onChange={set(key)} disabled={busy}
        placeholder={unit} aria-invalid={!!errors[key]} style={{ ...inputStyle, textAlign: 'start' }}
      />
    </div>
  );

  const errorList = Object.entries(errors).map(([field, code]) => manualErrorText(field, code, isHe));

  return (
    <form onSubmit={submit} noValidate
      style={{ marginTop: 10, padding: 14, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
        {isHe ? 'הזנת ערכים ידנית' : 'Enter the values yourself'}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 12 }}>
        {isHe ? 'אפשר להעתיק מהתווית על האריזה. הארוחה תסומן כ״הוזנה ידנית״.' : 'You can copy them from the package label. The meal is marked as entered by hand.'}
      </div>
      <label style={labelStyle} htmlFor="mm-name">{isHe ? 'שם הארוחה' : 'Meal name'} *</label>
      <input id="mm-name" type="text" value={form.name} onChange={set('name')} disabled={busy}
        maxLength={500} aria-invalid={!!errors.name} style={inputStyle} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {num('calories', isHe ? 'קלוריות' : 'Calories', isHe ? 'קק״ל' : 'kcal', true)}
        {num('protein', isHe ? 'חלבון (ג׳)' : 'Protein (g)', 'g')}
        {num('carbs', isHe ? 'פחמימות (ג׳)' : 'Carbs (g)', 'g')}
        {num('fat', isHe ? 'שומן (ג׳)' : 'Fat (g)', 'g')}
      </div>
      {(errorList.length > 0 || serverError) && (
        <div role="alert" style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)', lineHeight: 1.6 }}>
          {errorList.map((m) => <div key={m}>{m}</div>)}
          {serverError && !errorList.length && <div>{serverError}</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button type="submit" className="btn btn-accent" disabled={busy} style={{ flex: 2, minHeight: 44 }}>
          {busy ? (isHe ? 'שומר…' : 'Saving…') : (isHe ? 'שמור ארוחה' : 'Save meal')}
        </button>
        <button type="button" onClick={onCancel} disabled={busy}
          style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
          {isHe ? 'ביטול' : 'Cancel'}
        </button>
      </div>
    </form>
  );
}
