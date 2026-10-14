// Bounded local-only ring. Deliberately cannot accept tokens, URLs, filenames or identities.
export type MediaDiagnostic = { stage: 'queue' | 'grant' | 'grant-request' | 'download' | 'commit' | 'cache' | 'decode' | 'selection' | 'preparation' | 'screen-load';
  kind: 'image' | 'video' | 'mixed'; elapsedMs: number; bytes?: number; items?: number; reason?: 'insufficient-pool'; questionId?: number; httpStatus?: number; status: 'ok' | 'error' | 'cancelled' };
const events: MediaDiagnostic[] = [];
export function recordMediaDiagnostic(event: MediaDiagnostic) {
  events.push({ stage:event.stage, kind:event.kind, elapsedMs:Math.max(0,event.elapsedMs),
    bytes:event.bytes, items:event.items, reason:event.reason, questionId:event.questionId, httpStatus:event.httpStatus, status:event.status });
  if (events.length > 128) events.shift();
  if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_MEDIA_DIAGNOSTICS === '1') console.info('[media]',events.at(-1));
}
export const readMediaDiagnostics = () => events.map(event => ({...event}));
export const clearMediaDiagnostics = () => { events.length = 0; };
