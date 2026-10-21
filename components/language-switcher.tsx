"use client";

import { useLanguage } from "./language-provider";

function ThaiFlag() {
  return <svg viewBox="0 0 60 40" aria-hidden="true"><path fill="#a51931" d="M0 0h60v40H0z" /><path fill="#f4f5f8" d="M0 6.67h60v26.66H0z" /><path fill="#2d2a4a" d="M0 13.33h60v13.34H0z" /></svg>;
}
function UkFlag() {
  return <svg viewBox="0 0 60 40" aria-hidden="true"><defs><clipPath id="uk-flag-clip"><path d="M0 0h60v40H0z" /></clipPath></defs><g clipPath="url(#uk-flag-clip)"><path fill="#012169" d="M0 0h60v40H0z" /><path d="m0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="9" /><path d="m0 0 60 40M60 0 0 40" stroke="#c8102e" strokeWidth="3" /><path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" /><path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="7" /></g></svg>;
}

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return <div className="language-switcher" role="group" aria-label={language === "th" ? "เลือกภาษา" : "Choose language"}>
    <button type="button" lang="th" title="ภาษาไทย" aria-label="ภาษาไทย" aria-pressed={language === "th"} onClick={() => setLanguage("th")}><ThaiFlag /></button>
    <button type="button" lang="en" title="English" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}><UkFlag /></button>
  </div>;
}
