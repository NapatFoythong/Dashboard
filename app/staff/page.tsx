import StaffPortal from "@/components/staff-portal";
import data from "@/data/research.json";

export default function StaffPage() {
  return <StaffPortal mode="dashboard" data={data} />;
}
