"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { translate, type Language } from "@/lib/i18n";
import { programmeLabel } from "@/lib/analytics";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string | undefined, ...values: (string | number)[]) => string;
  yearLabel: (year: number) => string;
  programmeLabel: (programme: string) => string;
}
const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ children }: { children: ReactNode }) {
  // Keep the server and initial browser render identical; restore preference after hydration.
  const [language, setCurrentLanguage] = useState<Language>("th");
  useEffect(() => {
    try { const saved = localStorage.getItem("coc-language"); if (saved === "en" || saved === "th") setCurrentLanguage(saved); } catch { /* Storage may be unavailable. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    try { localStorage.setItem("coc-language", next); } catch { /* Session preference still works. */ }
  }, []);
  const t = useCallback((text: string | undefined, ...values: (string | number)[]) => translate(language, text, ...values), [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, t,
    yearLabel: year => language === "th" ? `${year + 543} (${year})` : `${year} (BE ${year + 543})`,
    programmeLabel: programme => t(programmeLabel(programme)),
  }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
