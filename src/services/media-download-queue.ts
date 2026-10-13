export type MediaDownloadPriority = 'foreground' | 'background';
type Pending = { priority: MediaDownloadPriority; key?: string; start: () => void };
const pending: Pending[] = [];
let running = 0;

function pump() {
  while (running < 2 && pending.length) {
    const foreground = pending.findIndex(job => job.priority === 'foreground');
    const [job] = pending.splice(foreground < 0 ? 0 : foreground, 1);
    running++;
    job.start();
  }
}

/** One shared transfer budget for players, preparation and optional offline downloads. */
export function promoteMediaDownload(key: string) {
  for (const job of pending) if (job.key === key) job.priority = 'foreground';
}

export function withMediaDownloadSlot<T>(operation: () => Promise<T>, priority: MediaDownloadPriority, key?: string) {
  return new Promise<T>((resolve, reject) => {
    pending.push({ priority, key, start: () => {
      void Promise.resolve().then(operation).then(resolve, reject).finally(() => { running--; pump(); });
    } });
    pump();
  });
}
