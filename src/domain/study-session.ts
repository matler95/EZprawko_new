export type StudyAnswer = { label: string; correct: boolean };
export type StudyAnswers = Readonly<Record<number, StudyAnswer>>;

// Only first, successfully persisted answers belong to a round. Reviewing a
// card is not another attempt; replaying mistakes starts a separate round.
export function studySummary(ids: readonly number[], answers: StudyAnswers) {
  const unique = [...new Set(ids)];
  const answered = unique.filter((id) => answers[id] !== undefined);
  const mistakes = answered.filter((id) => !answers[id].correct);
  return {
    total: unique.length,
    correct: answered.length - mistakes.length,
    incorrect: mistakes.length,
    unanswered: unique.length - answered.length,
    mistakes,
  };
}
