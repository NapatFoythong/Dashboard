"use client";

import { useEffect, useState } from "react";

const items = [
  { id: "overview", icon: "▦", label: "ภาพรวมผลงาน" },
  { id: "publications", icon: "▤", label: "รายการผลงาน" },
  { id: "faculty", icon: "♙", label: "ผลงานรายอาจารย์" },
  { id: "sources", icon: "ⓘ", label: "เกี่ยวกับข้อมูล" },
];

export default function SidebarNav() {
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

  return <nav aria-label="เมนูหลัก">
    {items.map(item => <a
      key={item.id}
      href={`#${item.id}`}
      className={active === item.id ? "active" : undefined}
      aria-current={active === item.id ? "location" : undefined}
      onClick={() => setActive(item.id)}
    ><span aria-hidden="true">{item.icon}</span> &nbsp; {item.label}</a>)}
  </nav>;
}
