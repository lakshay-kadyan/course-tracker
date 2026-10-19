import type { Attempt, Session, Subject } from "@/lib/types";
import { questions } from "@/lib/questions";

export const topicAccuracy = (attempts: Attempt[]) => {
  const acc: Record<string, { right: number; total: number }> = {};
  attempts.forEach((a) => a.answers.forEach((x) => {
    const q = questions.find((y) => y.id === x.qid); if (!q) return;
    const k = `${q.subjectId}:${q.topicId}`; const c = (acc[k] ??= { right: 0, total: 0 });
    c.total++; if (x.correct) c.right++;
  }));
  return acc;
};
export const taughtOn = (sessions: Session[], subjectId: string, topicId: string) =>
  sessions.filter((s) => s.subjectId === subjectId && s.status === "verified" && s.topics.some((t) => t.topicId === topicId)).sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null;
export const topicName = (s: Subject | undefined, id: string) => s?.topics.find((t) => t.id === id)?.name ?? id;
