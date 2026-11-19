import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { sleepAdvice, getChoice, setChoice, easeActive, previousNightHours } from './sleepAdvice.mjs';

// Wires the pure sleepAdvice() rules to the API and to the user's approve/skip
// answer. No sleep logged today (or the request failing) behaves exactly like
// before this feature existed: advice.level is 'none'.
export const SLEEP_CHANGED_EVENT = 'areto:sleep-changed'; // a night was (re)logged
const CHOICE_EVENT = 'areto:sleep-choice';                // approve/skip was pressed somewhere

export function notifySleepChanged() {
  try { window.dispatchEvent(new Event(SLEEP_CHANGED_EVENT)); } catch { /* ignore */ }
}

export default function useSleepAdvice(api, isTrainingDay) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const [data, setData] = useState({ hours: null, range: null, previousHours: null });
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const today = await apiRef.current('/sleep/today');
      let history = [];
      if (today?.sleep) {
        try { history = await apiRef.current('/sleep/history'); } catch { /* the previous night is optional */ }
      }
      const rec = today?.recommendation;
      setData({
        hours: today?.sleep?.hours ?? null,
        range: rec ? { min: rec.min, max: rec.max } : null,
        previousHours: previousNightHours(today?.sleep, history),
      });
    } catch { /* offline or server error → no advice */ }
  }, []);

  useEffect(() => {
    load();
    const onSleep = () => load();
    const onChoice = () => setTick((n) => n + 1);
    window.addEventListener(SLEEP_CHANGED_EVENT, onSleep);
    window.addEventListener(CHOICE_EVENT, onChoice);
    return () => {
      window.removeEventListener(SLEEP_CHANGED_EVENT, onSleep);
      window.removeEventListener(CHOICE_EVENT, onChoice);
    };
  }, [load]);

  const advice = useMemo(
    () => sleepAdvice({ hours: data.hours, range: data.range, isTrainingDay, previousHours: data.previousHours }),
    [data, isTrainingDay],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` re-reads storage after an answer
  const choice = useMemo(() => getChoice(data.hours), [data.hours, tick]);
  const choose = useCallback((c) => {
    setChoice(c, data.hours);
    try { window.dispatchEvent(new Event(CHOICE_EVENT)); } catch { /* ignore */ }
  }, [data.hours]);

  return { advice, choice, choose, easeOn: easeActive(advice, choice) };
}
