export type StudyFilter = "all" | "three" | "basic" | "specialist" | "mistakes" | "flags" | "hardest";
export function isStudyFilter(value: string | undefined): value is StudyFilter {
  return ["all", "three", "basic", "specialist", "mistakes", "flags", "hardest"].includes(value ?? "");
}
export function studyFilterSql(filter: StudyFilter) {
  const failureCount = "(SELECT COUNT(*) FROM practice_attempts p WHERE p.question_id=q.id AND p.is_correct=0)";
  switch (filter) {
    case "three": return { joins: "", where: "q.points=3", order: "RANDOM()" };
    case "basic": return { joins: "", where: "q.scope='PODSTAWOWY'", order: "RANDOM()" };
    case "specialist": return { joins: "", where: "q.scope='SPECJALISTYCZNY'", order: "RANDOM()" };
    case "flags": return { joins: "JOIN flags f ON f.question_id=q.id", where: "1=1", order: "f.created_at DESC" };
    case "mistakes": return { joins: "", where: `${failureCount}>0 OR EXISTS (SELECT 1 FROM exam_answers e WHERE e.question_id=q.id AND e.is_correct=0)`, order: "q.id DESC" };
    // Recurring errors lead; three-point questions fill remaining places.
    case "hardest": return { joins: "", where: `q.points=3 OR ${failureCount}>=2`, order: `${failureCount} DESC, q.points DESC, q.id ASC` };
    default: return { joins: "", where: "1=1", order: "RANDOM()" };
  }
}
