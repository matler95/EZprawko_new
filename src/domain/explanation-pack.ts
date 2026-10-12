export type ExplanationRecord = {
  questionId: number;
  explanationText: string;
  legalBasis: string;
  sourceUrl: string;
  reviewedAt: number;
  reviewedBy: string;
  sourceQuestion: string;
  correctAnswer: string;
  mediaFilename: string | null;
};
export type ExplanationPack = { version: string; entries: ExplanationRecord[] };
const nonempty = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
export function legalSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (url.hostname.endsWith(".gov.pl") || url.hostname === "gov.pl") ? url.href : null;
  } catch { return null; }
}
export function validateExplanationPack(value: unknown): asserts value is ExplanationPack {
  if (!value || typeof value !== "object") throw new Error("Invalid explanation pack");
  const pack = value as ExplanationPack;
  if (!nonempty(pack.version) || !Array.isArray(pack.entries)) throw new Error("Invalid explanation pack metadata");
  const ids = new Set<number>();
  for (const entry of pack.entries) {
    if (!entry || !Number.isSafeInteger(entry.questionId) || entry.questionId <= 0 || ids.has(entry.questionId) ||
      !nonempty(entry.explanationText) || !nonempty(entry.legalBasis) || !nonempty(entry.reviewedBy) || !legalSourceUrl(entry.sourceUrl) ||
      !Number.isSafeInteger(entry.reviewedAt) || entry.reviewedAt <= 0 || entry.reviewedAt > Date.now() ||
      !nonempty(entry.sourceQuestion) || !["T", "N", "A", "B", "C"].includes(entry.correctAnswer) ||
      !(entry.mediaFilename === null || nonempty(entry.mediaFilename))) throw new Error(`Invalid reviewed explanation ${entry?.questionId ?? "unknown"}`);
    ids.add(entry.questionId);
  }
}
