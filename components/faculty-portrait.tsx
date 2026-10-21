"use client";

import { useState } from "react";

export default function FacultyPortrait({ name, src, small = false }: { name: string; src?: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`faculty-photo${small ? " small" : ""}`}>
    {src && !failed ? <img src={src} alt={`รูปอาจารย์ ${name}`} width={225} height={300} loading={small ? "lazy" : "eager"} onError={() => setFailed(true)} /> : <div className="photo-placeholder"><span aria-hidden="true">{name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span>{!small && <small>ยังไม่มีรูปที่ยืนยันได้</small>}</div>}
  </div>;
}
