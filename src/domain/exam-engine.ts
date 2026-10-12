export type ExamScope = 'PODSTAWOWY' | 'SPECJALISTYCZNY';

export type ExamQuestion = {
  id: number;
  scope: ExamScope;
  points: 1 | 2 | 3;
  categories: string[];
};

export type Exam = {
  category: string;
  durationSeconds: number;
  passScore: number;
  maxScore: number;
  questions: ExamQuestion[];
};

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

export function buildOfficialExam(questions: ExamQuestion[], category: string, random = Math.random): Exam {
  const selected: ExamQuestion[] = [];
  for (const scope of ['PODSTAWOWY', 'SPECJALISTYCZNY'] as const) {
    for (const points of [3, 2, 1] as const) {
      const candidates = questions.filter((question) =>
        question.scope === scope && question.points === points &&
        (scope === 'PODSTAWOWY' || question.categories.includes(category))
      );
      const needed = QUOTAS[scope][points];
      if (candidates.length < needed) {
        throw new Error(`Not enough ${scope} ${points}-point questions for category ${category}`);
      }
      selected.push(...shuffle(candidates, random).slice(0, needed));
    }
  }
  const questionsInOrder = shuffle(selected, random);
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
