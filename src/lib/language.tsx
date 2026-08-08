import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translations, type Lang, type TranslationKey } from "./i18n";
import { useAuth } from "@/hooks/use-auth";

interface LanguageContextValue {
  lang: Lang;
  isKn: boolean;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const STORAGE_KEY = "gs_lang";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "kn" ? "kn" : "en";
    } catch {
      return "en";
    }
  });

  // Adopt the profile's preferred language until the user makes an explicit
  // local choice.
  useEffect(() => {
    if (user?.preferredLanguage) {
      let localChoice: string | null = null;
      try {
        localChoice = localStorage.getItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      if (localChoice === null) {
        setLangState(user.preferredLanguage);
      }
    }
  }, [user?.preferredLanguage]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      if (user) {
        void updateProfile({ preferredLanguage: next }).catch(() => {
          // non-critical — language still works locally
        });
      }
    },
    [user, updateProfile],
  );

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key],
    [lang],
  );

  const value = useMemo(
    () => ({ lang, isKn: lang === "kn", setLang, t }),
    [lang, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

/** Bilingual label helper for tool metadata. */
export function pickLang(lang: Lang, en: string, kn: string): string {
  return lang === "kn" ? kn : en;
}
