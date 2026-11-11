"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "./language-provider";

const VisitorContext = createContext<{ total: number | null; failed: boolean; retry: () => void }>({ total: null, failed: false, retry: () => {} });
export function VisitorProvider({ children }: { children: ReactNode }) {
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    async function load() {
      let id: string | null = null;
      try {
        id = localStorage.getItem("coc-visitor-id");
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) { id = crypto.randomUUID(); localStorage.setItem("coc-visitor-id", id); }
      } catch { id = null; /* Without persistent browser storage, show the count without recording a new visitor. */ }
      const response = await fetch("/api/visitors", { method: id ? "POST" : "GET", headers: id ? { "Content-Type": "application/json" } : undefined, body: id ? JSON.stringify({ id }) : undefined, cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Counter unavailable");
      const result = await response.json();
      if (!Number.isSafeInteger(result.total) || result.total < 0) throw new Error("Invalid count");
      if (active) setTotal(result.total);
    }
    load().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);
  return <VisitorContext.Provider value={{ total, failed, retry: () => setAttempt(value => value + 1) }}>{children}</VisitorContext.Provider>;
}
export default function VisitorCounter() {
  const { t } = useLanguage();
  const { total, failed, retry } = useContext(VisitorContext);
  return <section className="visitor-counter" aria-label={t("ผู้เข้าชมเว็บไซต์")}>
    <span>{t("ผู้เข้าชมเว็บไซต์")}</span><strong aria-live="polite">{failed ? "—" : total === null ? "…" : total.toLocaleString("en-US")}</strong>
    <small>{t("นับเบราว์เซอร์ไม่ซ้ำตั้งแต่เริ่มเปิดระบบนับ")}</small>
    {failed && <button onClick={retry}>{t("โหลดจำนวนผู้เข้าชมอีกครั้ง")}</button>}
  </section>;
}
