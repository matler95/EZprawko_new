import { supabase, supabaseConfigured } from "@/services/supabase";

export async function mediaGrant(filename: string) {
  if (!supabaseConfigured) throw new Error("Brakuje konfiguracji konta w aplikacji.");
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Zaloguj się w Ustawieniach, aby pobrać materiał.");
  const { data, error } = await supabase.functions.invoke<{ token: string; expiresAt: number }>("media-token", { body: { filename } });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : undefined;
    if (status === 401) throw new Error("Sesja została odrzucona przez Supabase. Wyloguj się i zaloguj ponownie.");
    if (status === 503) throw new Error("Serwis multimediów nie jest skonfigurowany. Brakuje sekretu podpisującego.");
    throw new Error(`Nie udało się uzyskać dostępu do materiału${status ? ` (Supabase HTTP ${status})` : ". Sprawdź połączenie z internetem"}.`);
  }
  if (!data?.token) throw new Error("Serwis nie zwrócił tokenu dostępu do materiału.");
  return data.token;
}
