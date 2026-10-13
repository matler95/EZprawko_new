import { uiLanguage, type UiLanguage } from '@/domain/ui-language';

export const uiLocales: Record<UiLanguage, string> = { pl: 'pl-PL', en: 'en-GB', de: 'de-DE', uk: 'uk-UA' };
const numberFormats = new Map<string, Intl.NumberFormat>();

/** UI-only formatting; never use the result in persistence, scoring or queries. */
export function formatUiNumber(value: number, language: UiLanguage = uiLanguage(), fractionDigits: 0 | 1 = 0) {
  if (!Number.isFinite(value)) return '—';
  const key = `${language}:${fractionDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(uiLocales[language], { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
    numberFormats.set(key, format);
  }
  return format.format(value);
}

/** Calendar date in interface locale, time in local device zone and 24-hour form. */
export function formatUiDateTime(timestamp: number, language: UiLanguage = uiLanguage()) {
  if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) return '—';
  // Don't retain a formatter with an old zone after device timezone changes.
  const format = new Intl.DateTimeFormat(uiLocales[language], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return format.format(timestamp);
}
