import { LayoutDashboard, Users, BookOpen, CalendarClock, Tag, Banknote, Settings } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";

const ITEMS = [
  ["/admin", "Overview", LayoutDashboard, true],
  ["/admin/users", "Users", Users],
  ["/admin/courses", "Courses", BookOpen],
  ["/admin/batches", "Batches", CalendarClock],
  ["/admin/promos", "Promo codes", Tag],
  ["/admin/cash-payments", "Cash payments", Banknote],
  ["/admin/settings", "Settings", Settings],
];

export default function AdminLayout() {
  return <DashboardLayout subtitle="Admin" items={ITEMS} />;
}