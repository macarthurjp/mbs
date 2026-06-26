
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AppLanguage = 'es' | 'en';

export const LANGUAGE_STORAGE_KEY = 'matmax_language';
export const LANGUAGE_CHANGE_EVENT = 'matmax_language_change';

type LanguageContextType = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getSavedLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'es';
  }

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  return savedLanguage === 'en' ? 'en' : 'es';
}

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getSavedLanguage());

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    const normalizedLanguage = nextLanguage === 'en' ? 'en' : 'es';

    setLanguageState(normalizedLanguage);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);

      window.dispatchEvent(
        new CustomEvent<AppLanguage>(LANGUAGE_CHANGE_EVENT, {
          detail: normalizedLanguage,
        })
      );
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'es' ? 'en' : 'es');
  }, [language, setLanguage]);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;

      setLanguageState(event.newValue === 'en' ? 'en' : 'es');
    }

    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<AppLanguage>;
      setLanguageState(customEvent.detail === 'en' ? 'en' : 'es');
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
    }),
    [language, setLanguage, toggleLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }

  return context;
}
