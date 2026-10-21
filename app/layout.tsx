import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./components.css";
import "./brand.css";
import LanguageProvider from "@/components/language-provider";

export const metadata: Metadata = {
  title: "CoC Research | ผลงานทางวิชาการ",
  description: "แดชบอร์ดผลงานทางวิชาการของอาจารย์วิทยาลัยการคอมพิวเตอร์",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="th"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
