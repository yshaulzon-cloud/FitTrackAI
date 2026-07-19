// The app's screens, expressed as the real UI operations that reach them. The
// dashboard tabs and settings sub-screens are React state (not routes), so we
// drive them by clicking the actual controls in the embedded app — exactly what
// a user does — rather than faking navigation. Requires an authenticated app
// (pick a persona first); when logged out the app redirects and steps no-op.

export const SCREEN_GROUPS = [
  {
    group: 'טאבים',
    items: [
      { id: 'today', label: 'היום', steps: [{ clickIndex: { sel: '.mobile-nav button', i: 0 } }] },
      { id: 'workout', label: 'אימון', steps: [{ clickIndex: { sel: '.mobile-nav button', i: 1 } }] },
      { id: 'nutrition', label: 'תזונה', steps: [{ clickIndex: { sel: '.mobile-nav button', i: 2 } }] },
      { id: 'journey', label: 'מסע', steps: [{ clickIndex: { sel: '.mobile-nav button', i: 3 } }] },
    ],
  },
  {
    group: 'הגדרות',
    items: [
      { id: 'settings', label: 'ראשי', steps: [{ click: '.mobile-topbar__profile' }] },
      { id: 'body', label: 'נתוני גוף', steps: [{ click: '.mobile-topbar__profile' }, { delay: 350 }, { clickIndex: { sel: '.st2-nav-item', i: 0 } }] },
      { id: 'goal', label: 'מטרה', steps: [{ click: '.mobile-topbar__profile' }, { delay: 350 }, { clickIndex: { sel: '.st2-nav-item', i: 1 } }] },
      { id: 'account', label: 'חשבון', steps: [{ click: '.mobile-topbar__profile' }, { delay: 350 }, { clickIndex: { sel: '.st2-nav-item', i: 2 } }] },
      { id: 'notif', label: 'התראות', steps: [{ click: '.mobile-topbar__profile' }, { delay: 350 }, { clickIndex: { sel: '.st2-nav-item', i: 3 } }] },
      { id: 'display', label: 'תצוגה', steps: [{ click: '.mobile-topbar__profile' }, { delay: 350 }, { clickIndex: { sel: '.st2-nav-item', i: 4 } }] },
      { id: 'privacy', label: 'פרטיות', steps: [{ click: '.mobile-topbar__profile' }, { delay: 350 }, { clickIndex: { sel: '.st2-nav-item', i: 7 } }] },
    ],
  },
];

// Curated feature flags — every one is a real localStorage key the app reads,
// so toggling genuinely changes behavior (no dead switches). Toggling reloads
// the app so it re-reads the key on mount.
export const FLAGS = [
  { key: 'a11y:reduceMotion', label: 'הפחת תנועה', on: '1', off: '0' },
  { key: 'a11y:highContrast', label: 'ניגודיות גבוהה', on: '1', off: '0' },
  { key: 'areto:intro-seen', label: 'דלג על אינטרו', on: '1', off: null },
];

// Text size is an enum, handled as its own control.
export const TEXT_SIZE = { key: 'a11y:textSize', options: ['small', 'normal', 'large'] };

// Special: force the weekly body-update banner by backdating its "last seen"
// key past the 7-day threshold.
export const FORCE_BODY_BANNER = {
  key: 'bodyUpdateLastSeen',
  value: () => String(Date.now() - 8 * 864e5),
};
