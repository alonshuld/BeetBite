import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "en" | "he";

const STORAGE_KEY = "beetbite.lang";

const translations = {
  en: {
    projectReports: "Project Reports",
    monthlyIncome: "Monthly Income",
    corporationPayments: "Corporation Payments",
    subcontractorPayments: "Subcontractor Payments",
    incomePerMonth: "Income Per Month",
    projects: "Projects",
    clients: "Clients",
    subcontractors: "Subcontractors",
    corporations: "Corporations",
    profitSimulator: "Profit Simulator",
    overview: "Overview",
    management: "Management",
    tools: "Tools",
    username: "Username",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    fillFields: "Please fill in all fields",
    constructionPlatform: "Construction management platform",
    copyright: "BeetBite © 2026",
    admin: "Admin",
    search: "Search…",
    noResults: "No results",
    noData: "No data",
    confirm: "Confirm",
    cancel: "Cancel",
    delete: "Delete",
    save: "Save",
    add: "Add",
    edit: "Edit",
    close: "Close",
  },
  he: {
    projectReports: "דוחות פרויקט",
    monthlyIncome: "הכנסה חודשית",
    corporationPayments: "תשלומי חברה",
    subcontractorPayments: "תשלומי קבלן משנה",
    incomePerMonth: "הכנסה לפי חודש",
    projects: "פרויקטים",
    clients: "לקוחות",
    subcontractors: "קבלני משנה",
    corporations: "חברות",
    profitSimulator: "סימולטור רווח",
    overview: "סקירה",
    management: "ניהול",
    tools: "כלים",
    username: "שם משתמש",
    password: "סיסמה",
    signIn: "כניסה",
    signingIn: "מתחבר…",
    fillFields: "נא למלא את כל השדות",
    constructionPlatform: "פלטפורמת ניהול בנייה",
    copyright: "BeetBite © 2026",
    admin: "מנהל",
    search: "חיפוש…",
    noResults: "אין תוצאות",
    noData: "אין נתונים",
    confirm: "אישור",
    cancel: "ביטול",
    delete: "מחיקה",
    save: "שמירה",
    add: "הוסף",
    edit: "עריכה",
    close: "סגור",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LangContextValue {
  lang: Lang;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

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

  function t(key: TranslationKey): string {
    return translations[lang][key];
  }

  return (
    <LangContext.Provider value={{ lang, isRTL, t, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
