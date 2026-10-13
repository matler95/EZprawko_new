import type { ExamQuestion } from '@/domain/exam-engine';
export function validExamSelection(questions: ExamQuestion[], category: string) {
  if (questions.length !== 32 || new Set(questions.map(q => q.id)).size !== 32) return false;
  const sections = [questions.slice(0, 20), questions.slice(20)];
  return sections.every((part, section) => part.every(q => q.scope === (section ? 'SPECJALISTYCZNY' : 'PODSTAWOWY') && q.categories.includes(category)) &&
    ([3, 2, 1] as const).every((weight, index) => part.filter(q => q.points === weight).length === (section ? [6, 4, 2] : [10, 6, 4])[index]));
}
