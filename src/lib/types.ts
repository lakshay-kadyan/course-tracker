export type Role = "admin" | "manager" | "faculty" | "student";
export type Health = "ON_TRACK" | "TIGHT" | "DANGER" | "COMPLETE";

export interface Campus { id: string; name: string; city: string; head: string; students: number }
export interface Batch { id: string; name: string; campusId: string; semester: string; students: number; startDate: string; endDate: string }
export interface Faculty { id: string; name: string; email: string; campusId: string; weeklyCapacity: number; specialty: string }
export interface Topic { id: string; unit: string; name: string; plannedHours: number; pct: number; examScope: boolean }
export interface Slot { id: string; day: number; start: string; hours: number }
export interface Subject {
  id: string; code: string; name: string; campusId: string; batchId: string; facultyId: string;
  startDate: string; targetDate: string; examDate: string; slots: Slot[]; topics: Topic[];
}
export interface Holiday { id: string; date: string; name: string; campusId: string }
export interface LectureNotes { keyConcepts: string[]; detail: string[]; examples: string[]; sources: string[] }
export interface SessionTopic { topicId: string; pct: number }
export interface Session {
  id: string; subjectId: string; facultyId: string; date: string;
  status: "verified" | "pending" | "missed"; source: "voice" | "text" | "manual" | "seed";
  hours: number; topics: SessionTopic[]; activities: string; homework: string; summary: string; notes?: LectureNotes;
}
export interface Question {
  id: string; subjectId: string; topicId: string; difficulty: "Easy" | "Medium" | "Hard";
  stem: string; options: string[]; answer: number; explanation: string;
}
export interface Attempt {
  id: string; date: string; subjectId: string; score: number; total: number;
  answers: { qid: string; choice: number; correct: boolean }[];
}
export interface Notification { id: string; title: string; body: string; time: string; read: boolean; roles: Role[] }
export interface Profile { name: string; email: string; emailAlerts: boolean; weeklyDigest: boolean }

export interface Persona { name: string; title: string; email: string; facultyId?: string; batchId?: string; campusId?: string }

export interface AppState {
  loggedIn: boolean; role: Role;
  /** Signed-in person's scope when connected to Supabase (null in the local demo, which uses PERSONAS). */
  me: Persona | null;
  campuses: Campus[]; batches: Batch[]; faculty: Faculty[]; subjects: Subject[]; holidays: Holiday[];
  sessions: Session[]; attempts: Attempt[]; notifications: Notification[];
  profiles: Record<Role, Profile>;
}
export type Collection = "campuses" | "batches" | "faculty" | "subjects" | "holidays" | "sessions";
