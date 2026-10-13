// Shared questions count once per category, but only once globally.
function explanationCoverage(questions, entries) {
  const byId = new Map(questions.map(q => [q.id, q]));
  const covered = new Set();
  for (const entry of entries) {
    const q = byId.get(entry.questionId);
    if (!q || q.question !== entry.sourceQuestion || q.correct_answer !== entry.correctAnswer || q.media_filename !== entry.mediaFilename) {
      throw new Error(`Source mismatch: ${entry.questionId}`);
    }
    covered.add(entry.questionId);
  }
  const priority = q => q.points === 3 || /(skrzyż|pierwszeństw)/.test(q.question.toLocaleLowerCase('pl-PL'));
  const summarize = pool => {
    const packagedExplanations = pool.filter(q => covered.has(q.id)).length;
    return { totalQuestions: pool.length, packagedExplanations,
      missingExplanations: pool.length - packagedExplanations,
      coveragePercent: pool.length ? Number((packagedExplanations * 100 / pool.length).toFixed(2)) : 0,
      priorityQuestions: pool.filter(priority).length,
      missingPriorityExplanations: pool.filter(q => priority(q) && !covered.has(q.id)).length };
  };
  const categories = new Map(), points = new Map();
  for (const q of questions) {
    const membership = JSON.parse(q.categories);
    if (!Array.isArray(membership) || membership.some(c => typeof c !== 'string' || !c)) throw new Error(`Invalid categories: ${q.id}`);
    for (const category of new Set(membership)) {
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(q);
    }
    if (!points.has(q.points)) points.set(q.points, []);
    points.get(q.points).push(q);
  }
  return { ...summarize(questions), threePointQuestions: questions.filter(q => q.points === 3).length,
    byCategory: [...categories].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([category, pool]) => ({ category, ...summarize(pool) })),
    byPoints: [...points].sort(([a], [b]) => a - b).map(([pointValue, pool]) => ({ points: pointValue, ...summarize(pool) })) };
}
module.exports = { explanationCoverage };
