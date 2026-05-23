import { useState, useEffect, ReactNode } from "react";
import { LangContext, translations, type Lang } from "./langContext";

const STORAGE_KEY = "beetbite.lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Lang) ?? "en";
  });

  const isRTL = lang === "he";

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  function t(key: keyof typeof translations.en): string {
    return translations[lang][key];
  }

  return (
    <LangContext.Provider value={{ lang, isRTL, t, setLang }}>
      {children}
    </LangContext.Provider>
  );
}
