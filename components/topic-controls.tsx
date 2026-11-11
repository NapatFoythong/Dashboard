"use client";
import { RESEARCH_TOPICS, researchTopics } from "@/lib/research-topics";
import { useLanguage } from "./language-provider";
export function TopicSelect({ value, onChange }: { value: string; onChange: (topic: string) => void }) {
  const { t } = useLanguage();
  return <label className="topic-control">{t("หัวข้อวิจัย")}<select value={value} onChange={e => onChange(e.target.value)}><option value="">{t("ทุกหัวข้อวิจัย")}</option>{RESEARCH_TOPICS.map(topic => <option key={topic.id} value={topic.id}>{t(topic.label)}</option>)}<option value="unclassified">{t("ยังไม่จัดหัวข้อ")}</option></select></label>;
}
export function TopicTags({ detail }: { detail: string }) {
  const { t } = useLanguage();
  const ids = researchTopics(detail);
  return <div className="topic-tags">{ids.length ? RESEARCH_TOPICS.filter(topic => ids.includes(topic.id)).map(topic => <span key={topic.id}>{t(topic.label)}</span>) : <span>{t("ยังไม่จัดหัวข้อ")}</span>}</div>;
}
export function TopicNote() {
  const { t } = useLanguage();
  return <p className="topic-note">{t("หัวข้อวิจัยจัดกลุ่มอัตโนมัติจากคำสำคัญในรายละเอียด CSV งานหนึ่งชิ้นมีได้หลายหัวข้อ และอาจจัดกลุ่มไม่ครบ ไม่ใช่การยืนยันความเชี่ยวชาญของอาจารย์")}<br />{t("ค้นหาได้ เช่น AI, ปัญญาประดิษฐ์ หรือ ADISAK AI")}</p>;
}
