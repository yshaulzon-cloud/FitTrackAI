import { createContext, useContext, useState } from 'react';
import LegalModal from '../components/LegalModal';

const LegalContext = createContext(null);

export function LegalProvider({ children }) {
  const [doc, setDoc] = useState(null); // null | 'privacy' | 'terms'

  return (
    <LegalContext.Provider
      value={{
        openPrivacy: () => setDoc('privacy'),
        openTerms:   () => setDoc('terms'),
        close:       () => setDoc(null),
        doc,
      }}
    >
      {children}
      {doc && <LegalModal doc={doc} onClose={() => setDoc(null)} />}
    </LegalContext.Provider>
  );
}

export function useLegal() {
  const ctx = useContext(LegalContext);
  if (!ctx) throw new Error('useLegal must be used within LegalProvider');
  return ctx;
}
