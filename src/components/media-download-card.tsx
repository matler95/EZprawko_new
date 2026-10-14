import { useTranslation } from '@/hooks/use-translation';
import { UiTokens } from '@/constants/ui-tokens';
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { mediaConfig } from '@/config/media';
import { mediaFilenamesForCategory } from '@/database/repository';
import { useTargetCategory } from '@/context/target-category-context';
import { preloadMedia } from '@/services/media-preload';
import type { DrivingCategory } from '@/domain/driving-categories';
import { AppButton, AppCard, AppStatus } from '@/components/ui/app-controls';

type DownloadControls = { disabled?: boolean; canStart?: () => boolean; onBusyChange?: (busy: boolean) => void };
export function MediaDownloadCard(controls: DownloadControls = {}) {
  const { category } = useTargetCategory();
  return <CategoryMediaDownloadCard key={category} category={category} {...controls} />;
}

function CategoryMediaDownloadCard({ category, disabled = false, canStart, onBusyChange }: { category: DrivingCategory } & DownloadControls) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const db = useSQLiteContext();
  const [progress, setProgress] = useState<{ completed: number; total: number }>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);
  const running = useRef(false);
  const generation = useRef(0);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    setProgress(undefined); setError(undefined); setBusy(running.current);
    return () => { focused.current = false; cancelled.current = true; generation.current++; };
  }, []));

  const preload = async () => {
    if (!mediaConfig.enabled || running.current || disabled || canStart?.() === false) return;
    running.current = true;
    onBusyChange?.(true);
    cancelled.current = false;
    const request = ++generation.current;
    setBusy(true);
    setError(undefined);
    setProgress({ completed: 0, total: 0 });

    try {
      const filenames = await mediaFilenamesForCategory(db, category);
      if (request !== generation.current || cancelled.current) return;
      const result = await preloadMedia(filenames, (value) => {
        if (request === generation.current) setProgress(value);
      }, () => request === generation.current && !cancelled.current, 'foreground');
      if (request === generation.current) {
        setProgress(result);
        if (result.completed < result.total) setError(t("Pobieranie przerwane. Możesz je ponowić; zapisane pliki zostaną wykorzystane."));
      }
    } catch {
      if (request === generation.current) setError(t("Nie udało się pobrać wszystkich materiałów. Sprawdź połączenie i spróbuj ponownie."));
    } finally {
      running.current = false;
      onBusyChange?.(false);
      if (focused.current) setBusy(false);
    }
  };

  const detail = !mediaConfig.enabled
    ? t('Zdjęcie lub film jest teraz niedostępny. Spróbuj później.')
    : progress
      ? t("{0}/{1} pobranych materiałów", [progress.completed, progress.total])
      : t("Pobierz do 250 materiałów dla kategorii {0}.", [category]);

  return (
    <AppCard>
      <View style={styles.copy}>
        <Text style={styles.title}>{t("Materiały offline")}</Text>
        <Text style={styles.detail}>{t(detail)}</Text>
        <Text style={styles.detail}>{t('To część materiałów kategorii. Zapisane pliki mogą zostać usunięte przez system lub po przekroczeniu limitu 200 MiB.')}</Text>
        {error ? <AppStatus tone="error" message={t(error)} /> : null}
      </View>
      <AppButton variant="gold" disabled={!mediaConfig.enabled || disabled} busy={busy} label={busy ? t('Przygotowujemy…') : error ? t("Spróbuj ponownie") : t("Pobierz")} onPress={preload} />
      {busy ? <AppButton variant="link" label={t("Przerwij po bieżącym pliku")} onPress={() => { cancelled.current = true; }} /> : null}
    </AppCard>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  copy: { gap: 5 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  detail: { color: colors.textSecondary, ...UiTokens.text.detail },
});
