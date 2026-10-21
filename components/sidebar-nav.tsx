"use client";
import { useLanguage } from "./language-provider";
import { useEffect, useState } from "react";
import Link from "next/link";
const items = [
    { id: "overview", icon: "▦", label: "ภาพรวมผลงาน" },
    { id: "our-work", icon: "▧", label: "ผลงานของเรา" },
    { id: "publications", icon: "▤", label: "รายการผลงาน" },
    { id: "faculty", icon: "♙", label: "ผลงานรายอาจารย์" },
    { id: "sources", icon: "ⓘ", label: "เกี่ยวกับข้อมูล" },
];
export default function SidebarNav({ page = "dashboard" }: { page?: "dashboard" | "our-work" }) {
    const { t, language } = useLanguage();
    const [active, setActive] = useState(page === "our-work" ? "our-work" : "overview");
    useEffect(() => {
        if (page === "our-work") { setActive("our-work"); return; }
        const syncHash = () => {
            const id = window.location.hash.slice(1);
            setActive(items.some(item => item.id === id) ? id : "overview");
        };
        syncHash();
        window.addEventListener("hashchange", syncHash);
        return () => window.removeEventListener("hashchange", syncHash);
    }, [page]);
    return <nav aria-label={t("เมนูหลัก")}>
    {items.map(item => <Link key={item.id} href={item.id === "our-work" ? "/our-work/" : `${page === "our-work" ? "/" : ""}#${item.id}`} className={active === item.id ? "active" : undefined} aria-current={active === item.id ? (item.id === "our-work" ? "page" : "location") : undefined} onClick={() => setActive(item.id)}><span aria-hidden="true">{item.icon}</span> &nbsp; {t(item.label)}</Link>)}
  </nav>;
}
