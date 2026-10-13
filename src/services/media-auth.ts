import { supabase, supabaseConfigured } from "@/services/supabase";
import { MediaAccountRequiredError } from '@/domain/account';
import { t } from '@/domain/ui-copy';

export async function mediaGrant(filename: string) {
  if (!supabaseConfigured) throw new Error("Brakuje konfiguracji konta w aplikacji.");
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new MediaAccountRequiredError();
  const { data, error } = await supabase.functions.invoke<{ token: string; expiresAt: number }>("media-token", { body: { filename } });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : undefined;
    if (status === 401) throw new MediaAccountRequiredError(true);
    if (status === 403) throw new Error(t('Dostęp do materiału nie został przyznany.'));
    throw new Error(t('Zdjęcie lub film jest teraz niedostępny. Spróbuj później.'));
  }
  if (!data?.token) throw new Error(t('Zdjęcie lub film jest teraz niedostępny. Spróbuj później.'));
  return data.token;
}
