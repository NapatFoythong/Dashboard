"use client";
import { useLanguage } from "./language-provider";
import { useEffect, useState } from "react";
const items = [
    { id: "overview", icon: "/icons/overview.png", label: "ภาพรวมผลงาน" },
    { id: "publications", icon: "/icons/publications.png", label: "รายการผลงาน" },
    { id: "faculty", icon: "/icons/faculty.png", label: "ผลงานรายอาจารย์" },
    { id: "sources", icon: "/icons/sources.png", label: "เกี่ยวกับข้อมูล" },
];
export default function SidebarNav() {
    const { t, language } = useLanguage();
    const [active, setActive] = useState("overview");
    useEffect(() => {
        const syncHash = () => {
            const id = window.location.hash.slice(1);
            setActive(items.some(item => item.id === id) ? id : "overview");
        };
        syncHash();
        window.addEventListener("hashchange", syncHash);
        return () => window.removeEventListener("hashchange", syncHash);
    }, []);
    return <nav aria-label={t("เมนูหลัก")}>
    {items.map(item => <a key={item.id} href={`#${item.id}`} className={active === item.id ? "active" : undefined} aria-current={active === item.id ? "location" : undefined} onClick={() => setActive(item.id)}><span className="sidebar-icon" aria-hidden="true" style={{ maskImage: `url(${item.icon})`, WebkitMaskImage: `url(${item.icon})` }} />{t(item.label)}</a>)}
  </nav>;
}
