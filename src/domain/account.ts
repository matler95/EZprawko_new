export function validLoginEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
export function accountErrorMessage(error: unknown) {
  const detail = error as { code?: string; status?: number; name?: string } | null;
  if (detail?.code === 'invalid_credentials') return 'Nie udało się zalogować. Sprawdź e-mail i hasło.';
  if (detail?.code === 'email_not_confirmed') return 'Adres e-mail nie został potwierdzony. Sprawdź wiadomość otrzymaną przy tworzeniu konta.';
  if (detail?.status === 429 || detail?.code === 'over_request_rate_limit') return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';
  if (detail?.name === 'AuthRetryableFetchError') return 'Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.';
  return 'Operacja konta nie powiodła się. Sprawdź połączenie i spróbuj ponownie.';
}
export class MediaAccountRequiredError extends Error {
  constructor(expired = false) {
    super(expired ? 'Sesja została odrzucona. Zaloguj się ponownie, aby pobrać materiał.' : 'Zaloguj się, aby pobrać zdjęcie lub film.');
    this.name = 'MediaAccountRequiredError';
  }
}
