// Singular / plural for day counts. "1 ימים" / "1 days" read as bugs.
// Hebrew: 1 → "יום", anything else (including 0 and 2) → "ימים".
// English: 1 → "day", anything else → "days".

export function daysWord(n, isHe) {
  const one = Number(n) === 1;
  return isHe ? (one ? 'יום' : 'ימים') : (one ? 'day' : 'days');
}

// "5 ימים" / "1 יום" / "5 days" / "1 day"
export function daysLabel(n, isHe) {
  return `${n} ${daysWord(n, isHe)}`;
}

// Streak phrases used on chips and aria-labels.
//   he: "רצף של יום" / "רצף של 5 ימים"      (headline form)
//   he (short): "יום ברצף" / "5 ימים ברצף"   (chip form)
//   en: "1-day streak" / "5-day streak"
export function streakHeadline(n, isHe) {
  if (!isHe) return `${n}-day streak`;
  return Number(n) === 1 ? 'רצף של יום' : `רצף של ${n} ימים`;
}

export function streakChip(n, isHe) {
  if (!isHe) return `${n}-day streak`;
  return `${n} ${daysWord(n, true)} ברצף`;
}
