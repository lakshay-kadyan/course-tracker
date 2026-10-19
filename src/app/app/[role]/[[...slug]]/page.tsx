"use client";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { notFound, useParams } from "next/navigation";
import { AppShell, type Crumb } from "@/components/shell/AppShell";
import { NAV, ROLE_META } from "@/components/shell/nav";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { AdminOverview } from "@/features/admin/Overview";
import { BatchesPage, CalendarPage, CampusesPage, FacultyAdminPage, SubjectsPage } from "@/features/admin/Setup";
import { CurriculumPage } from "@/features/admin/Curriculum";
import { TimetablePage } from "@/features/admin/Timetable";
import { DataPage } from "@/features/admin/DataPage";
import { ManagerOverview } from "@/features/manager/Overview";
import { HealthPage } from "@/features/manager/Health";
import { WarningsPage } from "@/features/manager/Warnings";
import { FacultyProgressPage } from "@/features/manager/FacultyProgress";
import { ReportPage } from "@/features/manager/Report";
import { SubjectDetail } from "@/features/manager/SubjectDetail";
import { FacultyDashboard } from "@/features/faculty/Dashboard";
import { LogClassPage } from "@/features/faculty/LogClass";
import { MySubjectsPage } from "@/features/faculty/MySubjects";
import { HistoryPage } from "@/features/faculty/History";
import { StudentOverview } from "@/features/student/Overview";
import { LecturesPage } from "@/features/student/Lectures";
import { PracticePage } from "@/features/student/Practice";
import { ReadinessPage } from "@/features/student/Readiness";

const ROLES = ["admin", "manager", "faculty", "student"];
const PAGES: Record<Role, Record<string, () => React.ReactNode>> = {
  admin: { "": () => <AdminOverview />, campuses: () => <CampusesPage />, batches: () => <BatchesPage />, subjects: () => <SubjectsPage />, faculty: () => <FacultyAdminPage />, calendar: () => <CalendarPage />, curriculum: () => <CurriculumPage />, timetable: () => <TimetablePage />, data: () => <DataPage /> },
  manager: { "": () => <ManagerOverview />, health: () => <HealthPage />, warnings: () => <WarningsPage />, faculty: () => <FacultyProgressPage />, report: () => <ReportPage /> },
  faculty: { "": () => <FacultyDashboard />, log: () => <LogClassPage />, subjects: () => <MySubjectsPage />, history: () => <HistoryPage /> },
  student: { "": () => <StudentOverview />, lectures: () => <LecturesPage />, practice: () => <PracticePage />, readiness: () => <ReadinessPage /> },
};

export default function RolePage() {
  return <Suspense fallback={<div className="p-6"><PageSkeleton /></div>}><RoleView /></Suspense>;
}

function RoleView() {
  const { role: roleParam, slug: slugParam } = useParams<{ role: string; slug?: string[] }>();
  const { state } = useStore();
  if (!ROLES.includes(roleParam)) notFound();
  const role = roleParam as Role;
  const parts = slugParam ?? [];
  const slug = parts.join("/");
  const root: Crumb = { label: ROLE_META[role].short, href: `/app/${role}` };

  if (parts[0] === "subject" && parts[1] && (role === "manager" || role === "admin")) {
    const s = state.subjects.find((x) => x.id === parts[1]);
    const campus = state.campuses.find((c) => c.id === s?.campusId);
    const batch = state.batches.find((b) => b.id === s?.batchId);
    return (
      <AppShell role={role} slug="subject" title={s ? `${s.name} · ${s.code}` : "Subject not found"} crumbs={[root, { label: campus?.name ?? "Campus" }, { label: batch?.name ?? "Batch" }, { label: s?.name ?? "Subject" }]}>
        <SubjectDetail subjectId={parts[1]} />
      </AppShell>
    );
  }
  const render = PAGES[role][slug];
  if (!render) notFound();
  const nav = NAV[role].find((n) => n.slug === slug);
  const title = nav?.label ?? "";
  return (
    <AppShell role={role} slug={slug} title={slug === "" ? (role === "student" ? `Welcome back, ${state.profiles.student.name.split(" ")[0]}` : role === "faculty" ? "Voice & Verification Hub" : role === "manager" ? "Campus Command Centre" : "Academic Control Centre") : title} crumbs={slug === "" ? [root, { label: "Overview" }] : [root, { label: title }]}>
      {render()}
    </AppShell>
  );
}
