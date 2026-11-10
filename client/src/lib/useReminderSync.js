import { useEffect } from 'react';
import { eatenSlots, workedOutToday, weeklyGoalMet } from './notifPlan.mjs';
import { updateReminderState, requestReminderSync } from './notifications';

// Keeps the scheduled notifications in step with what the user has already
// done today. Mounted once at the top of the Dashboard (always on screen),
// NOT inside Settings: the old code only re-synced reminders while the
// Settings screen happened to be open.
//
// It reports facts (meals eaten, workout done, streak already safe) and the
// planner decides what to drop. It also re-syncs when:
//   - the app returns to the foreground (the 7-day window is rebuilt, and a
//     new day starts clean)
//   - a menu row is ticked/unticked ('areto:menu-logged', fired by the
//     nutrition tab)
//   - the user changed a notification setting ('areto:notif-prefs')
export function useReminderSync({ todayNutrition, workoutHistory, profile, progressionData, isHe, restDayToday }) {
  // Meals eaten today: manual log entries (by time of day) + ticked menu rows.
  const loggedMeals = todayNutrition?.meals;
  useEffect(() => {
    const compute = () => {
      let menuMeals = [], menuTicked = [];
      try {
        const saved = JSON.parse(localStorage.getItem('nutrition:menuState') || 'null');
        if (saved?.menuLogged?.date === new Date().toDateString()) {
          menuMeals = saved.menu?.meals || [];
          menuTicked = saved.menuLogged.idxs || [];
        }
      } catch { /* ignore corrupt storage */ }
      updateReminderState({ eatenSlots: [...eatenSlots({ loggedMeals: loggedMeals || [], menuMeals, menuTicked })].sort() }, { isHe });
    };
    compute();
    window.addEventListener('areto:menu-logged', compute);
    return () => window.removeEventListener('areto:menu-logged', compute);
  }, [loggedMeals, isHe]);

  // Workout facts, once history has loaded (null → not loaded yet: report nothing).
  const workouts = workoutHistory?.workouts;
  const perWeek = profile?.workoutsPerWeek;
  useEffect(() => {
    if (!workouts) return;
    updateReminderState({
      workedOutToday: workedOutToday(workouts),
      weeklyGoalMet: weeklyGoalMet(workouts, perWeek),
    }, { isHe });
  }, [workouts, perWeek, isHe]);

  useEffect(() => {
    if (typeof restDayToday === 'boolean') updateReminderState({ restDayToday }, { isHe });
  }, [restDayToday, isHe]);

  // Streak: only trust the server's flag once progression has loaded.
  const activeToday = progressionData?.activeToday;
  useEffect(() => {
    if (typeof activeToday === 'boolean') updateReminderState({ activityDoneToday: activeToday }, { isHe });
  }, [activeToday, isHe]);

  // Rebuild on app start, return to foreground, and settings changes.
  useEffect(() => {
    const resync = () => requestReminderSync({ isHe, delay: 300 });
    resync();
    const onVisible = () => { if (!document.hidden) resync(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('areto:notif-prefs', resync);
    let removeResume = null;
    (async () => {
      try {
        if (window.Capacitor?.isNativePlatform?.() === true) {
          const { App } = await import('@capacitor/app');
          const h = await App.addListener('resume', resync);
          removeResume = () => h.remove();
        }
      } catch { /* plugin unavailable */ }
    })();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('areto:notif-prefs', resync);
      if (removeResume) removeResume();
    };
  }, [isHe]);
}
