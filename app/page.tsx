import Dashboard from "@/components/dashboard";
import data from "@/data/research.json";

export default function HomePage() {
  return <Dashboard data={data} />;
}
