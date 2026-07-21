import { createContext, useContext, useEffect, useState } from 'react';

// Mirrors ThemeContext's pattern: state lives here (not inside the Settings
// screen) so it's active from first paint, and syncs to <html> data-*
// attributes that index.css reads — this is what actually makes the toggles
// in Settings do something, instead of just writing to localStorage.
const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [textSize, setTextSizeState] = useState(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('a11y:textSize') : null;
    return v === 'small' || v === 'large' ? v : 'normal';
  });
  const [reduceMotion, setReduceMotionState] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('a11y:reduceMotion') === '1'
  );
  const [highContrast, setHighContrastState] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('a11y:highContrast') === '1'
  );

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? '1' : '0';
  }, [reduceMotion]);
  useEffect(() => {
    document.documentElement.dataset.highContrast = highContrast ? '1' : '0';
  }, [highContrast]);

  function setTextSize(v) {
    setTextSizeState(v);
    localStorage.setItem('a11y:textSize', v);
  }
  function setReduceMotion(v) {
    setReduceMotionState(v);
    localStorage.setItem('a11y:reduceMotion', v ? '1' : '0');
  }
  function setHighContrast(v) {
    setHighContrastState(v);
    localStorage.setItem('a11y:highContrast', v ? '1' : '0');
  }

  return (
    <AccessibilityContext.Provider value={{
      textSize, setTextSize, reduceMotion, setReduceMotion, highContrast, setHighContrast,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
