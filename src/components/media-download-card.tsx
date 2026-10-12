import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { mediaConfig } from '@/config/media';
import { mediaFilenamesForCategory } from '@/database/repository';
import { useTargetCategory } from '@/context/target-category-context';
import { preloadMedia } from '@/services/media-preload';
import type { DrivingCategory } from '@/domain/driving-categories';

export function MediaDownloadCard() {
  const { category } = useTargetCategory();
  return <CategoryMediaDownloadCard key={category} category={category} />;
}

function CategoryMediaDownloadCard({ category }: { category: DrivingCategory }) {
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
    if (!mediaConfig.enabled || running.current) return;
    running.current = true;
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
      }, () => request === generation.current && !cancelled.current);
      if (request === generation.current) {
        setProgress(result);
        if (result.completed < result.total) setError('Pobieranie przerwane. Możesz je ponowić; zapisane pliki zostaną wykorzystane.');
      }
    } catch {
      if (request === generation.current) setError('Nie udało się pobrać wszystkich materiałów. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      running.current = false;
      if (focused.current) setBusy(false);
    }
  };

  const detail = !mediaConfig.enabled
    ? 'Skonfiguruj prywatny adres CDN, aby umożliwić pobieranie materiałów.'
    : progress
      ? `${progress.completed}/${progress.total} pobranych materiałów`
      : `Pobierz do 250 materiałów dla kategorii ${category}.`;

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>Materiały offline</Text>
        <Text style={styles.detail}>{detail}</Text>
        <Text style={styles.detail}>To ograniczona partia, nie pełny pakiet kategorii. Cache może być usunięty przez system lub limit 1 GB.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!mediaConfig.enabled || busy}
        onPress={preload}
        style={({ pressed }) => [
          styles.button,
          (!mediaConfig.enabled || busy) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}>
        {busy ? <ActivityIndicator color={colors.onGold} /> : <Text style={styles.buttonText}>{error ? 'Spróbuj ponownie' : 'Pobierz'}</Text>}
      </Pressable>
      {busy ? <Pressable accessibilityRole="button" onPress={() => { cancelled.current = true; }} style={styles.button}><Text style={styles.buttonText}>Przerwij po bieżącym pliku</Text></Pressable> : null}
    </View>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 14 },
  copy: { gap: 5 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  detail: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  error: { color: colors.error, fontSize: 13, lineHeight: 19 },
  button: { alignItems: 'center', backgroundColor: colors.accentGold, borderRadius: 10, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  buttonDisabled: { backgroundColor: colors.disabledSurface },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: colors.onGold, fontSize: 14, fontWeight: '800' },
});
