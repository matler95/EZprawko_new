import { supabase } from '@/services/supabase';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';

let mutations: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const pending = mutations.then(operation, operation);
  mutations = pending.catch(() => {});
  return pending;
}
export function signInExistingAccount(email: string, password: string) {
  const revision = userDataRevision();
  return serialize(async () => {
    if (!userDataWritable(revision)) throw new Error('Local data maintenance');
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!userDataWritable(revision)) {
      // Ignore stale UI completion. Full deletion waits in this same queue and
      // signs out afterward; a progress-only reset must not erase the account.
      throw new Error('Local data maintenance');
    }
    return result;
  });
}
// Full local deletion uses the same queue, so pending login cannot recreate it.
export function signOutLocalAccount() {
  return serialize(() => supabase.auth.signOut({ scope: 'local' }));
}
