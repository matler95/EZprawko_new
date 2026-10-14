export type ExamScope = 'PODSTAWOWY' | 'SPECJALISTYCZNY';

export type ExamQuestion = {
  id: number;
  scope: ExamScope;
  points: 1 | 2 | 3;
  categories: string[];
  /** Time during which an answer is intentionally unavailable. */
  readingTimeSeconds: number;
  /** Time available to select the answer after the reading phase. */
  answeringTimeSeconds: number;
};

export type Exam = {
  reuseFallback?: 'insufficient-pool';
  category: string;
  durationSeconds: number;
  passScore: number;
  maxScore: number;
  questions: ExamQuestion[];
};

type ExamQuestionSource = Omit<
  ExamQuestion,
  'readingTimeSeconds' | 'answeringTimeSeconds'
>;

const QUOTAS: Record<ExamScope, Record<1 | 2 | 3, number>> = {
  PODSTAWOWY: { 3: 10, 2: 6, 1: 4 },
  SPECJALISTYCZNY: { 3: 6, 2: 4, 1: 2 },
};

const shuffle = <T,>(items: T[], random: () => number) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
};

export function buildOfficialExam(
  questions: ExamQuestionSource[],
  category: string,
  random = Math.random,
  reuse?: { retainedIds: readonly number[]; excludedIds: readonly number[] },
): Exam {
  const retained = new Set(reuse?.retainedIds);
  const excluded = new Set(reuse?.excludedIds);
  // Keep the original random selection policy when a reuse bucket is exhausted.
  if (reuse && (['PODSTAWOWY', 'SPECJALISTYCZNY'] as const).some(scope =>
    ([3, 2, 1] as const).some(points => questions.filter(q => q.scope === scope && q.points === points &&
      q.categories.includes(category) && !excluded.has(q.id)).length < QUOTAS[scope][points]))) {
    return { ...buildOfficialExam(questions, category, random), reuseFallback: 'insufficient-pool' };
  }
  const questionsByScope = {} as Record<ExamScope, ExamQuestion[]>;
  for (const scope of ['PODSTAWOWY', 'SPECJALISTYCZNY'] as const) {
    const selected: ExamQuestion[] = [];
    for (const points of [3, 2, 1] as const) {
      const candidates = questions.filter((question) =>
        question.scope === scope && question.points === points &&
        (scope === 'PODSTAWOWY' || question.categories.includes(category)) && !excluded.has(question.id)
      );
      const needed = QUOTAS[scope][points];
      if (candidates.length < needed) {
        throw new Error(`Not enough ${scope} ${points}-point questions for category ${category}`);
      }
      const kept = candidates.filter(q => retained.has(q.id)).slice(0, needed);
      selected.push(
        ...[...kept, ...shuffle(candidates.filter(q => !retained.has(q.id)), random).slice(0, needed - kept.length)]
          .map((question) => ({
            ...question,
            readingTimeSeconds: scope === 'PODSTAWOWY' ? 20 : 0,
            answeringTimeSeconds: scope === 'PODSTAWOWY' ? 15 : 50,
          })),
      );
    }
    // Only randomize within an official section. Basic questions must remain
    // in positions 1-20 and specialist questions in positions 21-32.
    questionsByScope[scope] = shuffle(selected, random);
  }
  const questionsInOrder = [
    ...questionsByScope.PODSTAWOWY,
    ...questionsByScope.SPECJALISTYCZNY,
  ];
  const total = questionsInOrder.reduce((sum, question) => sum + question.points, 0);
  if (questionsInOrder.length !== 32 || total !== 74 || new Set(questionsInOrder.map((question) => question.id)).size !== 32) {
    throw new Error('Generated exam violates the official structure');
  }
  return { category, durationSeconds: 25 * 60, passScore: 68, maxScore: 74, questions: questionsInOrder };
}

export function examScore(exam: Exam, answers: Record<number, boolean>) {
  return exam.questions.reduce((score, question) => score + (answers[question.id] ? question.points : 0), 0);
}

export function passedExam(exam: Exam, answers: Record<number, boolean>) {
  return examScore(exam, answers) >= exam.passScore;
}
