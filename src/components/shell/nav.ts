import { BarChart3, BookOpen, Building2, CalendarDays, ClipboardCheck, Database, FileText, GraduationCap, Layers, LayoutDashboard, Library, Mic, Siren, Target, Users, Clock } from "lucide-react";
import type { Role } from "@/lib/types";

export const ROLE_META: Record<Role, { label: string; short: string }> = {
  admin: { label: "Admin / Program Manager", short: "Admin" },
  manager: { label: "Campus Manager", short: "Manager" },
  faculty: { label: "Faculty", short: "Faculty" },
  student: { label: "Student", short: "Student" },
};
export interface NavItem { slug: string; label: string; icon: typeof LayoutDashboard }
export const NAV: Record<Role, NavItem[]> = {
  admin: [
    { slug: "", label: "Overview", icon: LayoutDashboard },
    { slug: "campuses", label: "Campuses", icon: Building2 },
    { slug: "batches", label: "Batches", icon: Layers },
    { slug: "subjects", label: "Subjects", icon: BookOpen },
    { slug: "faculty", label: "Faculty", icon: Users },
    { slug: "calendar", label: "Academic Calendar", icon: CalendarDays },
    { slug: "curriculum", label: "Curriculum & Lesson Plans", icon: Library },
    { slug: "timetable", label: "Timetable", icon: Clock },
    { slug: "data", label: "Import / Export", icon: Database },
  ],
  manager: [
    { slug: "", label: "Overview", icon: LayoutDashboard },
    { slug: "health", label: "Course Health", icon: BarChart3 },
    { slug: "warnings", label: "Early Warnings", icon: Siren },
    { slug: "faculty", label: "Faculty Progress", icon: Users },
    { slug: "report", label: "Weekly Report", icon: FileText },
  ],
  faculty: [
    { slug: "", label: "Dashboard", icon: LayoutDashboard },
    { slug: "log", label: "Log Class", icon: Mic },
    { slug: "subjects", label: "My Subjects", icon: BookOpen },
    { slug: "history", label: "Session History", icon: ClipboardCheck },
  ],
  student: [
    { slug: "", label: "My Learning", icon: GraduationCap },
    { slug: "lectures", label: "Lectures & Notes", icon: BookOpen },
    { slug: "practice", label: "Practice", icon: Target },
    { slug: "readiness", label: "Exam Readiness", icon: BarChart3 },
  ],
};
export const subjectHref = (role: Role, id: string) =>
  role === "manager" ? `/app/manager/subject/${id}` : role === "admin" ? `/app/admin/subject/${id}` : role === "faculty" ? `/app/faculty/subjects?subject=${id}` : `/app/student/lectures?subject=${id}`;
