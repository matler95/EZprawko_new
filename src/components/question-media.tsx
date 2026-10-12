import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useEventListener } from 'expo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { deliveredMediaFilename, mediaConfig } from '@/config/media';
import { cachedMediaUri } from '@/services/media-cache';
import { MediaAccountRequiredError } from '@/domain/account';
import { MediaAccountCard } from '@/components/media-account-card';

type QuestionMediaProps = {
  filename?: string | null;
  examMode?: boolean;
  onVideoEnd?: () => void;
};

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
const playableVideoExtensions = new Set(['mp4', 'm4v', 'mov']);

function extension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function VideoMedia({
  uri,
  examMode = false,
  onVideoEnd,
}: {
  uri: string;
  examMode?: boolean;
  onVideoEnd?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    if (examMode) instance.play();
  });
  useEventListener(player, 'playToEnd', () => onVideoEnd?.());

  return (
    <VideoView
      contentFit="contain"
      nativeControls={!examMode}
      player={player}
      style={styles.video}
    />
  );
}

export function QuestionMedia({ filename, examMode, onVideoEnd }: QuestionMediaProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [retry, setRetry] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [media, setMedia] = useState<{
    filename: string;
    uri?: string;
    error?: string;
    requiresAccount?: boolean;
  }>();

  useEffect(() => {
    let active = true;

    if (!filename || !mediaConfig.enabled) return;

    cachedMediaUri(filename)
      .then((value) => {
        if (active) setMedia({ filename, uri: value });
      })
      .catch((reason: unknown) => {
        if (active) {
          setMedia({
            filename,
            error: reason instanceof Error ? reason.message : 'Nie udało się pobrać materiału. Spróbuj ponownie później.',
            requiresAccount: reason instanceof MediaAccountRequiredError,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [filename, retry]);

  if (!filename) return null;

  const uri = media?.filename === filename ? media.uri : undefined;
  const error = media?.filename === filename ? media.error : undefined;

  const fileExtension = extension(deliveredMediaFilename(filename));
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
        {!examMode && media?.requiresAccount ? <>
          <Pressable accessibilityRole="button" onPress={() => setAccountOpen(true)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={styles.statusTitle}>Zaloguj się do materiałów</Text></Pressable>
          <Modal visible={accountOpen} animationType="slide" onRequestClose={() => setAccountOpen(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 24, gap: 16 }}>
                  <Pressable accessibilityRole="button" onPress={() => setAccountOpen(false)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={styles.statusTitle}>Wróć do pytania</Text></Pressable>
                  <MediaAccountCard onAuthenticated={() => { setAccountOpen(false); setMedia(undefined); setRetry(value => value + 1); }} />
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Modal>
        </> : null}
        <Pressable onPress={() => { setMedia(undefined); setRetry((value) => value + 1); }} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={styles.statusTitle}>Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accentGold} />
        <Text style={styles.statusCopy}>Pobieranie materiału…</Text>
      </View>
    );
  }

  if (isImage) return <Image accessibilityLabel="Materiał do pytania" resizeMode="contain" source={{ uri }} style={styles.image} />;

  if (canPlay) return <VideoMedia examMode={examMode} onVideoEnd={onVideoEnd} uri={uri} />;

  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>Wideo wymaga konwersji</Text>
      <Text style={styles.statusCopy}>Przed publikacją materiał powinien być dostarczony w formacie MP4.</Text>
    </View>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  image: { width: '100%', height: 220, marginBottom: 16 },
  video: { width: '100%', height: 220, marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  loading: { minHeight: 100, gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 6, marginBottom: 16 },
  statusTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  statusCopy: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
});
