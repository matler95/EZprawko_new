import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { mediaConfig } from '@/config/media';
import { mediaFilenamesForCategory } from '@/database/repository';
import { useTargetCategory } from '@/context/target-category-context';
import { preloadMedia } from '@/services/media-preload';

export function MediaDownloadCard() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const db = useSQLiteContext();
  const { category } = useTargetCategory();
  const [progress, setProgress] = useState<{ completed: number; total: number }>();
  const [error, setError] = useState<string>();

  const preload = async () => {
    if (!mediaConfig.enabled) return;
    setError(undefined);
    setProgress({ completed: 0, total: 0 });

    try {
      const filenames = await mediaFilenamesForCategory(db, category);
      const result = await preloadMedia(filenames, setProgress);
      setProgress(result);
    } catch {
      setError('Nie udało się pobrać wszystkich materiałów. Sprawdź połączenie i spróbuj ponownie.');
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!mediaConfig.enabled || Boolean(progress && progress.completed < progress.total)}
        onPress={preload}
        style={({ pressed }) => [
          styles.button,
          (!mediaConfig.enabled || Boolean(progress && progress.completed < progress.total)) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}>
        {progress && progress.completed < progress.total ? <ActivityIndicator color={colors.onGold} /> : <Text style={styles.buttonText}>Pobierz</Text>}
      </Pressable>
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
