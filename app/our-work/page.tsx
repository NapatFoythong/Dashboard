import type { Metadata } from "next";
import OurWork from "@/components/our-work";
import data from "@/data/research.json";

export const metadata: Metadata = {
  title: "ผลงานของเรา | Our publications · CoC Research",
  description: "รวมผลงานทางวิชาการของวิทยาลัยการคอมพิวเตอร์ เลือกประเภท ค้นหา และดูรายละเอียดผลงาน",
};

export default function OurWorkPage() {
  return <OurWork data={data} />;
}
