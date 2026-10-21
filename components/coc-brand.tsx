"use client";
import { useLanguage } from "./language-provider";
export default function CocBrand({ className = "" }: {
    className?: string;
}) {
    const { t, language } = useLanguage();
    return <div className={`coc-brand ${className}`}>
    <img src="/brand/coc-psu-color.png" alt="College of Computing, Prince of Songkla University" width={580} height={126}/>
    <span>{t("วิทยาลัยการคอมพิวเตอร์ · มหาวิทยาลัยสงขลานครินทร์")}</span>
  </div>;
}
