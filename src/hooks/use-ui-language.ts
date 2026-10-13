import { useSyncExternalStore } from 'react';
import { subscribeUiLanguage, uiLanguage } from '@/domain/ui-language';
export const useUiLanguage = () => useSyncExternalStore(subscribeUiLanguage, uiLanguage, uiLanguage);
