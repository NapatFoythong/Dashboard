export const RESEARCH_TOPICS = [
  { id: "ai", label: "AI / ปัญญาประดิษฐ์", aliases: ["ai", "ml", "ปัญญาประดิษฐ์", "artificial intelligence", "machine learning", "deep learning"], pattern: /\b(?:AI|artificial intelligence|machine learning|deep learning|neural networks?|neural computing|reinforcement learning|natural language processing|NLP|large language models?|LLM|random forests?|support vector machines?)\b|ปัญญาประดิษฐ์|การเรียนรู้ของเครื่อง/i },
  { id: "data", label: "Data Science / วิทยาการข้อมูล", aliases: ["data science", "วิทยาการข้อมูล", "big data", "data mining"], pattern: /\b(?:data science|data mining|big data|data analytics|data analysis|predictive analytics|recommendation systems?|recommender systems?)\b|วิทยาการข้อมูล|เหมืองข้อมูล|วิเคราะห์ข้อมูล/i },
  { id: "security", label: "Cybersecurity / ความมั่นคงปลอดภัยไซเบอร์", aliases: ["cybersecurity", "security", "ความมั่นคงปลอดภัยไซเบอร์", "ความปลอดภัย", "ความปลอดภัยไซเบอร์"], pattern: /\b(?:cyber.?security|cryptograph\w*|encryption|intrusion|malware|ransomware|authentication|privacy|security|secure|vulnerabilit\w*|blockchain)\b|ความปลอดภัย|การเข้ารหัส/i },
  { id: "network", label: "Networks & IoT / เครือข่ายและไอโอที", aliases: ["iot", "network", "networks", "เครือข่าย", "ไอโอที", "internet of things"], pattern: /\b(?:IoT|internet of things|wireless|sensor networks?|computer networks?|5G|6G|communications?|routing|MIMO|OFDM)\b|เครือข่าย|ไอโอที/i },
  { id: "software", label: "Software Engineering / วิศวกรรมซอฟต์แวร์", aliases: ["software engineering", "software", "วิศวกรรมซอฟต์แวร์", "ซอฟต์แวร์"], pattern: /\b(?:software|requirements|test cases?|formal methods?|formal modelling|formal modeling|co-simulation|program analysis|program verification)\b|ซอฟต์แวร์/i },
  { id: "vision", label: "Computer Vision / ภาพและการมองเห็น", aliases: ["computer vision", "image", "ภาพและการมองเห็น", "ประมวลผลภาพ"], pattern: /\b(?:computer vision|image processing|image classification|image segmentation|object detection|face recognition|facial recognition|image recognition|convolutional neural|CNN)\b|ประมวลผลภาพ|รู้จำใบหน้า/i },
  { id: "education", label: "Education / เทคโนโลยีการศึกษา", aliases: ["education", "การศึกษา", "เทคโนโลยีการศึกษา", "e-learning"], pattern: /\b(?:education\w*|e-learning|learning management|teaching|classroom|students?|pedagogy|learning outcomes|game.based learning)\b|การศึกษา|การเรียนการสอน/i },
  { id: "hci", label: "HCI & Games / ปฏิสัมพันธ์และเกม", aliases: ["hci", "games", "game", "เกม", "ปฏิสัมพันธ์", "user experience"], pattern: /\b(?:human.computer interaction|HCI|user experience|usability|user interfaces?|games?|gamification|virtual reality|augmented reality)\b|เกม|ปฏิสัมพันธ์/i },
] as const;

export function researchTopics(detail: string): string[] {
  // URL paths and DOI strings are references, not subject evidence.
  const citation = detail.replace(/https?:\/\/\S+|\b10\.\d{4,9}\/\S+/gi, " ");
  return RESEARCH_TOPICS.filter(topic => topic.pattern.test(citation)).map(topic => topic.id);
}
const normal = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export function isTopicQuery(query: string) {
  return RESEARCH_TOPICS.some(topic => (topic.aliases as readonly string[]).includes(normal(query)));
}
export function matchesResearchQuery(detail: string, query: string, extra = "") {
  const q = normal(query);
  if (!q) return true;
  const ids = researchTopics(detail);
  const alias = (value: string) => RESEARCH_TOPICS.find(topic => (topic.aliases as readonly string[]).includes(value));
  const phrase = alias(q);
  if (phrase) return ids.includes(phrase.id);
  const text = normal(`${detail} ${extra}`);
  return q.split(/\s+/).every(token => {
    const topic = alias(token);
    return topic ? ids.includes(topic.id) : text.includes(token);
  });
}
