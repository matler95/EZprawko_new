import { prepareExamMedia, type MediaPreloadProgress } from '@/services/media-preload';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';

export type StudyMediaQuestion = { id: number; media_filename: string | null };

/** Keeps the selected pool fixed across retries. Does not write answers or draw questions. */
export function createStudyPreparation(questions: readonly StudyMediaQuestion[]) {
  const pool = questions.map(question => ({ mediaFilename: question.media_filename }));
  const revision = userDataRevision();
  let generation = 0;
  let running = false;
  return {
    cancel() { generation++; },
    async run(onProgress: (progress: MediaPreloadProgress) => void) {
      if (running) return false;
      running = true;
      const request = ++generation;
      const current = () => generation === request && userDataWritable(revision);
      try {
        await prepareExamMedia(pool, progress => { if (current()) onProgress(progress); }, current);
        return current();
      } catch (error) {
        if (!current()) return false;
        throw error;
      } finally { running = false; }
    },
  };
}
