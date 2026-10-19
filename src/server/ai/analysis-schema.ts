import { z } from "zod";

/** Request accepted by the analysis service. Bounded to protect cost and latency. */
export const AnalyzeRequestSchema = z.object({
  transcript: z.string().trim().min(20, "transcript is too short to analyze").max(200_000),
  subjectName: z.string().trim().max(200).optional(),
  syllabusTopics: z.array(z.object({ id: z.string().min(1).max(64), name: z.string().min(1).max(200), unit: z.string().max(200).optional() })).max(300).optional(),
  syllabusText: z.string().max(100_000).optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

const conf = z.number().min(0).max(1);
export const Coverage = z.enum(["not_covered", "mentioned_only", "partially_covered", "substantially_covered", "fully_covered"]);

/** Shape we ask Gemini for. Always re-validated here; model output is never trusted as-is. */
export const ModelOutputSchema = z.object({
  summary: z.string().default(""),
  topicsIdentified: z.array(z.object({ name: z.string(), evidence: z.array(z.string()).default([]), confidence: conf })).default([]),
  conceptsExplained: z.array(z.string()).default([]),
  syllabusMatches: z.array(z.object({ topicId: z.string(), coverage: Coverage, evidence: z.array(z.string()).default([]), confidence: conf, rationale: z.string().default("") })).default([]),
  proposedProgressUpdates: z.array(z.object({ topicId: z.string(), suggestedPct: z.number().min(0).max(100), rationale: z.string().default(""), confidence: conf })).default([]),
  needsFacultyVerification: z.array(z.object({ topicId: z.string().optional(), topic: z.string(), reason: z.string() })).default([]),
  uncertainties: z.array(z.string()).default([]),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

export interface Evidence { text: string; verifiedInTranscript: boolean }
/** What callers receive. Clearly an AI suggestion, never an official record. */
export interface AnalysisResult {
  status: "ai_suggestion";
  verified: false;
  disclaimer: string;
  provider: "gemini";
  model: string;
  generatedAt: string;
  summary: string;
  topicsIdentified: { name: string; evidence: Evidence[]; confidence: number }[];
  conceptsExplained: string[];
  syllabusMatches: { topicId: string; topicName: string; coverage: z.infer<typeof Coverage>; evidence: Evidence[]; confidence: number; rationale: string }[];
  proposedProgressUpdates: { topicId: string; topicName: string; suggestedPct: number; rationale: string; confidence: number; lowConfidence: boolean; requiresVerification: true }[];
  needsFacultyVerification: { topicId?: string; topic: string; reason: string }[];
  uncertainties: string[];
}
