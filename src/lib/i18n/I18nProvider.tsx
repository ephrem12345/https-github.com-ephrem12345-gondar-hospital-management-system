"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { am } from "./dictionaries/am";
import { en, type Dictionary } from "./dictionaries/en";

export type Language = "en" | "am";

const STORAGE_KEY = "ghms-language";

const dictionaries: Record<Language, Dictionary> = { en, am };

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Dictionary | string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "am" ? stored : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    setLanguageState(getStoredLanguage());
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: keyof Dictionary | string): string => {
      const dict = dictionaries[language];
      return dict[key as keyof Dictionary] ?? en[key as keyof Dictionary] ?? key;
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
