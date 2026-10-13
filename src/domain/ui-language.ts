export type UiLanguage = 'pl' | 'en' | 'de' | 'uk';
let current: UiLanguage = 'pl';
const listeners = new Set<() => void>();
export const uiLanguage = () => current;
export function setUiLanguage(value: UiLanguage) { current = value; for (const listener of listeners) listener(); }
export const subscribeUiLanguage = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function systemUiLanguage(): UiLanguage {
  const code = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];
  return code === 'en' || code === 'de' || code === 'uk' ? code : 'pl';
}
