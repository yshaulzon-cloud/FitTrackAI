// Copy for the training/rest-day card on the nutrition tab.
//
// The server sends deltaPct with one decimal (e.g. -4.5, 6). The card shows a
// whole number in words ("about 5% below usual") and never a +/- sign next to
// the digits: a leading minus can flip inside RTL text (see SleepTracker.jsx).
// The direction comes from the sign of deltaPct, not from the day type.

export function roundedDeltaPct(deltaPct) {
  const n = Number(deltaPct);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.abs(n));
}

// → { label, summary, detail }   detail is only set on rest days
export function dayTypeNote({ type, deltaPct } = {}, isHe = true) {
  const isTraining = type === 'training';
  const pct = roundedDeltaPct(deltaPct);
  const higher = Number(deltaPct) > 0;

  const label = isTraining
    ? (isHe ? 'יום אימון' : 'Training day')
    : (isHe ? 'יום מנוחה' : 'Rest day');

  let summary;
  if (pct === 0) {
    summary = isHe ? 'היעד היום כרגיל.' : 'Today\'s target is as usual.';
  } else if (isHe) {
    summary = `היעד היום ${higher ? 'גבוה' : 'נמוך'} בכ-${pct}% מהרגיל. הממוצע השבועי נשאר אותו דבר.`;
  } else {
    summary = `Today's target is about ${pct}% ${higher ? 'above' : 'below'} usual. Your weekly average stays the same.`;
  }

  const detail = isTraining ? null : (isHe
    ? 'מנוחה היא חלק מהאימון: השרירים נבנים בזמן ההתאוששות. תיעוד ארוחה או שינה ישמור על הרצף גם היום.'
    : 'Rest is part of training: muscle is built while you recover. Logging a meal or sleep today still keeps your streak.');

  return { label, summary, detail };
}
