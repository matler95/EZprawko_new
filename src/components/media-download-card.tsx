import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { mediaConfig } from '@/config/media';
import { mediaFilenamesForCategory, selectedCategory } from '@/database/repository';
import { preloadMedia } from '@/services/media-preload';

export function MediaDownloadCard() {
  const db = useSQLiteContext();
  const [category, setCategory] = useState('B');
  const [progress, setProgress] = useState<{ completed: number; total: number }>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    selectedCategory(db).then(setCategory);
  }, [db]);

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
        {progress && progress.completed < progress.total ? <ActivityIndicator color="#11202C" /> : <Text style={styles.buttonText}>Pobierz</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#18202A', borderRadius: 16, padding: 16, gap: 14 },
  copy: { gap: 5 },
  title: { color: '#F4F7FA', fontSize: 16, fontWeight: '700' },
  detail: { color: '#AAB5C2', fontSize: 13, lineHeight: 19 },
  error: { color: '#F28B82', fontSize: 13, lineHeight: 19 },
  button: { alignItems: 'center', backgroundColor: '#F0C96A', borderRadius: 10, minHeight: 42, justifyContent: 'center', paddingHorizontal: 14 },
  buttonDisabled: { backgroundColor: '#43505C' },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: '#11202C', fontSize: 14, fontWeight: '800' },
});
