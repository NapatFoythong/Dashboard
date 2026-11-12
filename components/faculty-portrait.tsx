"use client";
import { useLanguage } from "./language-provider";
import { useState } from "react";
export default function FacultyPortrait({ name, src, small = false }: {
    name: string;
    src?: string;
    small?: boolean;
}) {
    const { t, language } = useLanguage();
    const [failed, setFailed] = useState(false);
    return <div className={`faculty-photo${small ? " small" : ""}`}>
    {src && !failed ? <img src={src} alt={t("รูปอาจารย์ {0}", name)} width={225} height={300} loading={small ? "lazy" : "eager"} decoding="async" style={small ? { objectPosition: "center 12%", scale: "1.2", transformOrigin: "center top" } : undefined} onError={() => setFailed(true)}/> : <div className="photo-placeholder"><span aria-hidden="true">{name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span>{!small && <small>{t("ยังไม่มีรูปที่ยืนยันได้")}</small>}</div>}
  </div>;
}
