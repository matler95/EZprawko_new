import { supabase, supabaseConfigured } from '@/services/supabase';
import { MediaAccountRequiredError } from '@/domain/account';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { t } from '@/domain/ui-copy';

type Grant = { filename?: string; token: string; expiresAt?: number };
type Job = { filename: string; epoch: number; revision: number; resolve: (token: string) => void; reject: (error: unknown) => void };
const grants = new Map<string, Grant>();
const requests = new Map<string, Promise<string>>();
const pending: Job[] = [];
let context = '', epoch = 0, subscribed = false, scheduled = false, batchSupported = true;
let authEpoch = 0;

function invalidate() { epoch++; context = ''; grants.clear(); requests.clear(); }
function failure(status?: number) {
  if (status === 401) return new MediaAccountRequiredError(true);
  return new Error(t(status === 403 ? 'Dostęp do materiału nie został przyznany.' : 'Zdjęcie lub film jest teraz niedostępny. Spróbuj później.'));
}
const statusOf = (error: { context?: unknown } | null) => error?.context instanceof Response ? error.context.status : undefined;

async function invoke(filenames: string[]) {
  if (batchSupported) {
    const { data, error } = await supabase.functions.invoke<{ grants: Grant[] }>('media-token', { body: { filenames } });
    if (!error) {
      if (!Array.isArray(data?.grants)) throw failure();
      return data.grants;
    }
    // Old deployments accept only filename. Do not downgrade auth/access failures.
    if (statusOf(error) !== 400) throw failure(statusOf(error));
    batchSupported = false;
  }
  return Promise.all(filenames.map(async filename => {
    const { data, error } = await supabase.functions.invoke<Grant>('media-token', { body: { filename } });
    if (error || !data?.token) throw failure(statusOf(error));
    return { ...data, filename };
  }));
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  void new Promise<void>(resolve => setTimeout(resolve, 8)).then(async () => {
    scheduled = false;
    const jobs = pending.splice(0, 8);
    if (pending.length) schedule();
    const current = jobs.filter(job => job.epoch === epoch && userDataWritable(job.revision));
    for (const job of jobs) if (!current.includes(job)) job.reject(new MediaAccountRequiredError(true));
    if (!current.length) return;
    try {
      const response = await invoke(current.map(job => job.filename));
      for (const job of current) {
        if (job.epoch !== epoch || !userDataWritable(job.revision)) { job.reject(new MediaAccountRequiredError(true)); continue; }
        const grant = response.find(value => value.filename === job.filename);
        if (!grant || typeof grant.token !== 'string' || !grant.token ||
            (grant.expiresAt !== undefined && (!Number.isSafeInteger(grant.expiresAt) || grant.expiresAt <= Date.now()/1000 + 15 || grant.expiresAt > Date.now()/1000 + 300))) {
          job.reject(failure()); continue;
        }
        if (grant.expiresAt !== undefined) {
          while (grants.size >= 256) grants.delete(grants.keys().next().value!);
          grants.set(job.filename, grant);
        }
        job.resolve(grant.token);
      }
    } catch (error) { for (const job of current) job.reject(error); }
  });
}

/** Coalesce simultaneous misses into <=8 object-bound grants. Never persist tokens. */
export async function mediaGrant(filename: string) {
  if (!supabaseConfigured) throw new Error('Brakuje konfiguracji konta w aplikacji.');
  if (!subscribed) {
    subscribed = true;
    supabase.auth.onAuthStateChange(event => { if (event !== 'INITIAL_SESSION') { authEpoch++; invalidate(); } });
  }
  const revision = userDataRevision();
  const startedEpoch = authEpoch;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || !userDataWritable(revision) || authEpoch !== startedEpoch) throw new MediaAccountRequiredError();
  const identity = `${revision}:${data.session.access_token}`;
  if (context !== identity) { if (context) invalidate(); context = identity; }
  const cached = grants.get(filename);
  if (cached?.expiresAt && cached.expiresAt > Date.now()/1000 + 30) return cached.token;
  grants.delete(filename);
  const key = `${epoch}:${filename}`;
  const previous = requests.get(key);
  if (previous) return previous;
  const request = new Promise<string>((resolve, reject) => {
    pending.push({ filename, resolve, reject, epoch, revision }); schedule();
  });
  requests.set(key, request);
  try { return await request; } finally { if (requests.get(key) === request) requests.delete(key); }
}
