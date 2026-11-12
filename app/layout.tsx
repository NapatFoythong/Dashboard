import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./components.css";
import "./brand.css";
import "./redesign.css";
import LanguageProvider from "@/components/language-provider";
import { VisitorProvider } from "@/components/visitor-counter";

export const metadata: Metadata = {
  title: "CoC Research | ผลงานทางวิชาการ",
  description: "แดชบอร์ดผลงานทางวิชาการของอาจารย์วิทยาลัยการคอมพิวเตอร์",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="th"><body><LanguageProvider><VisitorProvider>{children}</VisitorProvider></LanguageProvider></body></html>;
}
