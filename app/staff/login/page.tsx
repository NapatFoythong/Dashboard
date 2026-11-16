import StaffPortal from "@/components/staff-portal";

const emptyData = { staff: [], publications: [] };

export default function StaffLoginPage() {
  return <StaffPortal mode="login" data={emptyData} />;
}
