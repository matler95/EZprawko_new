import { useCallback } from 'react';
import { t as translate } from '@/domain/ui-copy';
import { useUiLanguage } from '@/hooks/use-ui-language';
export function useTranslation() {
  const language = useUiLanguage();
  const t = useCallback((key: string | null | undefined, values: readonly (string | number)[] = []) => translate(key, values, language), [language]);
  return { t, language };
}
