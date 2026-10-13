import { useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getQuestionExplanation, type QuestionExplanation as ExplanationValue } from '@/database/explanations';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { ExplanationCard } from '@/components/explanation-card';

/** Read-only recovery shared by Study feedback and completed exam review. */
export function QuestionExplanation({ questionId }: { questionId: number }) {
  const db = useSQLiteContext();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    questionId: number; attempt: number; value: ExplanationValue | null; failed: boolean;
  } | null>(null);
  const locked = useRef(true);
  useEffect(() => {
    let current = true;
    const revision = userDataRevision();
    const valid = () => current && userDataWritable(revision);
    void getQuestionExplanation(db, questionId).then(value => {
      if (valid()) setResult({ questionId, attempt, value, failed: false });
    }).catch(() => {
      if (valid()) setResult({ questionId, attempt, value: null, failed: true });
    }).finally(() => { if (current) locked.current = false; });
    return () => { current = false; };
  }, [db, questionId, attempt]);
  const resolved = result?.questionId === questionId && result.attempt === attempt;
  return <ExplanationCard key={questionId} explanation={resolved ? result.value : null} loading={!resolved}
    failed={resolved && result.failed} onRetry={() => {
      if (locked.current || !resolved || !result.failed) return;
      locked.current = true;
      setAttempt(value => value + 1);
    }} />;
}
