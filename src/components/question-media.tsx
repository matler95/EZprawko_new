import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { mediaConfig } from '@/config/media';
import { cachedMediaUri } from '@/services/media-cache';

type QuestionMediaProps = {
  filename?: string | null;
};

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
const playableVideoExtensions = new Set(['mp4', 'm4v', 'mov']);

function extension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function VideoMedia({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return <VideoView contentFit="contain" nativeControls player={player} style={styles.video} />;
}

export function QuestionMedia({ filename }: QuestionMediaProps) {
  const [media, setMedia] = useState<{
    filename: string;
    uri?: string;
    error?: string;
  }>();

  useEffect(() => {
    let active = true;

    if (!filename || !mediaConfig.enabled) return;

    cachedMediaUri(filename)
      .then((value) => {
        if (active) setMedia({ filename, uri: value });
      })
      .catch(() => {
        if (active) {
          setMedia({
            filename,
            error: 'Nie udało się pobrać materiału. Spróbuj ponownie później.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [filename]);

  if (!filename) return null;

  const uri = media?.filename === filename ? media.uri : undefined;
  const error = media?.filename === filename ? media.error : undefined;

  const fileExtension = extension(filename);
  const canPlay = playableVideoExtensions.has(fileExtension);
  const isImage = imageExtensions.has(fileExtension);

  if (!mediaConfig.enabled) {
    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Materiał do pytania</Text>
        <Text style={styles.statusCopy}>Będzie dostępny po skonfigurowaniu prywatnego CDN.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Materiał niedostępny</Text>
        <Text style={styles.statusCopy}>{error}</Text>
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#F0C96A" />
        <Text style={styles.statusCopy}>Pobieranie materiału…</Text>
      </View>
    );
  }

  if (isImage) return <Image accessibilityLabel="Materiał do pytania" resizeMode="contain" source={{ uri }} style={styles.image} />;

  if (canPlay) return <VideoMedia uri={uri} />;

  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>Wideo wymaga konwersji</Text>
      <Text style={styles.statusCopy}>Przed publikacją materiał powinien być dostarczony w formacie MP4.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 220, marginBottom: 16 },
  video: { width: '100%', height: 220, marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  loading: { minHeight: 100, gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusCard: { backgroundColor: '#18202A', borderRadius: 14, padding: 16, gap: 6, marginBottom: 16 },
  statusTitle: { color: '#F4F7FA', fontWeight: '700', fontSize: 15 },
  statusCopy: { color: '#AAB5C2', fontSize: 13, lineHeight: 19 },
});
