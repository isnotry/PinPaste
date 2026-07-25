import { useCallback, useEffect, useState } from "react";
import { type Lang, createT, type TFunc } from "../i18n";

const STORAGE_KEY = "pinpaste-lang";

function getInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;
  // 默认根据浏览器语言
  return navigator.language.startsWith("zh") ? "zh" : "en";
}

export function useLang() {
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const t: TFunc = createT(lang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const changeLang = useCallback((l: Lang) => {
    setLang(l);
  }, []);

  return { lang, t, changeLang };
}
