import { MediaAccountRequiredError } from '@/domain/account';
import { uiCopy } from '@/domain/ui-copy';

// Never display raw network/FS/backend errors: they may contain private URLs or paths.
const safeKeys = new Set([
  'Dostęp do materiału nie został przyznany.',
  'Zdjęcie lub film jest teraz niedostępny. Spróbuj później.',
  'Brak miejsca na przygotowanie materiałów. Usuń pobrane materiały i spróbuj ponownie.',
]);
export function mediaErrorMessage(reason: unknown) {
  if (reason instanceof MediaAccountRequiredError) return reason.message;
  if (reason instanceof Error) {
    const known = uiCopy.find(row => safeKeys.has(row[0]) && row.some(value => value === reason.message));
    if (known) return known[0];
  }
  return 'Nie udało się pobrać materiału. Sprawdź połączenie i spróbuj ponownie.';
}
