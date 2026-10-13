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

export type MediaFailure = {
  kind: 'account' | 'access' | 'storage' | 'unavailable' | 'download';
  message: string;
  retryable: boolean;
};

/** Unknown transport errors do not prove the device is offline. */
export function mediaFailure(reason: unknown): MediaFailure {
  const message = mediaErrorMessage(reason);
  if (reason instanceof MediaAccountRequiredError) return { kind: 'account', message, retryable: false };
  if (message === 'Dostęp do materiału nie został przyznany.') return { kind: 'access', message, retryable: false };
  if (message === 'Brak miejsca na przygotowanie materiałów. Usuń pobrane materiały i spróbuj ponownie.') return { kind: 'storage', message, retryable: false };
  if (message === 'Zdjęcie lub film jest teraz niedostępny. Spróbuj później.') return { kind: 'unavailable', message, retryable: true };
  return { kind: 'download', message, retryable: true };
}
