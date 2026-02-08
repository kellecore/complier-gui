"use client";

import { useEffect, useState } from "react";

export type AppLang = "tr" | "en";

const LANG_KEY = "complier_gui_lang";

function detectInitialLang(): AppLang {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem(LANG_KEY);
  if (saved === "tr" || saved === "en") return saved;
  return (window.navigator.language || "").toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function useAppLanguage() {
  const [lang, setLangState] = useState<AppLang>("tr");

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  const setLang = (next: AppLang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_KEY, next);
    }
  };

  const t = (en: string, tr: string) => (lang === "tr" ? tr : en);

  return { lang, setLang, t };
}
