"use client";
import { useLanguage } from "./language-provider";
export default function CocBrand({ className = "" }: {
    className?: string;
}) {
    const { t } = useLanguage();
    return <div className={`coc-brand ${className}`}>
    <picture className="brand-image"><img src="/brand/psu-phuket-campus.png" alt="Prince of Songkla University, Phuket Campus" width={671} height={457}/></picture>
    <span>{t("วิทยาลัยการคอมพิวเตอร์")}</span>
  </div>;
}
