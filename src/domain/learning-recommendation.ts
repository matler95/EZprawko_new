export type TopicInsight = { topic: string; total: number; answered: number; correct: number };
// Product heuristic for choosing a practice topic, not a readiness/confidence score.
export const MIN_TOPIC_SAMPLE = 5;
export function rankTopicInsights(topics: readonly TopicInsight[]) {
  return [...topics].sort((a, b) => Number(b.answered >= MIN_TOPIC_SAMPLE) - Number(a.answered >= MIN_TOPIC_SAMPLE)
    || (a.answered && b.answered ? a.correct / a.answered - b.correct / b.answered : b.answered - a.answered)
    || b.answered - a.answered || a.topic.localeCompare(b.topic));
}
export function learningRecommendation(topics: readonly TopicInsight[], historicalMistakes = 0) {
  const weak = rankTopicInsights(topics).filter(topic => topic.answered >= MIN_TOPIC_SAMPLE && topic.correct < topic.answered);
  if (weak.length) return { kind: 'topic' as const, topic: weak[0] };
  if (historicalMistakes > 0) return { kind: 'mistakes' as const, count: historicalMistakes };
  return { kind: 'practice' as const };
}
