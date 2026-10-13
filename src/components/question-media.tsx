import { useTranslation } from '@/hooks/use-translation';
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useEvent, useEventListener } from 'expo';
import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { deliveredMediaFilename, mediaConfig } from '@/config/media';
import { cachedMediaUri } from '@/services/media-cache';
import { mediaFailure, type MediaFailure } from '@/domain/media-error';
import { MediaAccountCard } from '@/components/media-account-card';

type QuestionMediaProps = {
  filename?: string | null;
  examMode?: boolean;
  onVideoEnd?: () => void;
  onReadyChange?: (ready: boolean) => void;
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
  onError,
  onReadyChange,
}: {
  uri: string;
  examMode?: boolean;
  onVideoEnd?: () => void;
  onError?: () => void;
  onReadyChange: (ready: boolean) => void;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    if (examMode) instance.play();
  });
  useEventListener(player, 'playToEnd', () => onVideoEnd?.());
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEffect(() => {
    onReadyChange(status === 'readyToPlay');
    if (status === 'error') onError?.();
  }, [status, onReadyChange, onError]);

  return (
    <VideoView
      contentFit="contain"
      nativeControls={!examMode}
      player={player}
      style={styles.video}
    />
  );
}

export function QuestionMedia({ filename, examMode, onVideoEnd, onReadyChange }: QuestionMediaProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [retry, setRetry] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [media, setMedia] = useState<{
    filename: string;
    uri?: string;
    error?: string;
    failure?: MediaFailure;
    decoded?: boolean;
  }>();
  const markReady = useCallback((decoded: boolean) => {
    setMedia(current => current && current.filename === filename && current.uri && !current.error && current.decoded !== decoded
      ? { ...current, decoded } : current);
  }, [filename]);
  const playbackError = useCallback(() => {
    setMedia(current => current && current.filename === filename
      ? { filename: current.filename, error: 'Nie udało się odtworzyć materiału. Spróbuj ponownie.' } : current);
  }, [filename]);
  useEffect(() => {
    onReadyChange?.(!filename || Boolean(media?.filename === filename && media.uri && media.decoded && !media.error));
  }, [filename, media, onReadyChange]);

  useEffect(() => {
    let active = true;

    if (!filename || !mediaConfig.enabled) return;

    cachedMediaUri(filename)
      .then((value) => {
        if (!value) throw new Error('Missing media');
        if (active) setMedia({ filename, uri: value, decoded: false });
      })
      .catch((reason: unknown) => {
        if (active) {
          const failure = mediaFailure(reason);
          setMedia({
            filename,
            error: failure.message,
            failure,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [filename, retry, t]);

  if (!filename) return null;

  const uri = media?.filename === filename ? media.uri : undefined;
  const error = media?.filename === filename ? media.error : undefined;

  const fileExtension = extension(deliveredMediaFilename(filename));
  const canPlay = playableVideoExtensions.has(fileExtension);
  const isImage = imageExtensions.has(fileExtension);

  if (!mediaConfig.enabled) {
    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>{t("Materiał do pytania")}</Text>
        <Text style={styles.statusCopy}>{t('Zdjęcie lub film jest teraz niedostępny. Spróbuj później.')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>{t("Materiał niedostępny")}</Text>
        <Text style={styles.statusCopy}>{t(error)}</Text>
        {!examMode && media?.failure?.kind === 'account' ? <>
          <Pressable accessibilityRole="button" onPress={() => setAccountOpen(true)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={styles.statusTitle}>{t("Zaloguj się do materiałów")}</Text></Pressable>
          <Modal visible={accountOpen} animationType="slide" onRequestClose={() => setAccountOpen(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 24, gap: 16 }}>
                  <Pressable accessibilityRole="button" onPress={() => setAccountOpen(false)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={styles.statusTitle}>{t("Wróć do pytania")}</Text></Pressable>
                  <MediaAccountCard onAuthenticated={() => { setAccountOpen(false); setMedia(undefined); setRetry(value => value + 1); }} />
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Modal>
        </> : null}
        {!examMode && (media?.failure?.kind === 'access' || media?.failure?.kind === 'storage') ?
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/settings')} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={styles.statusTitle}>{t('Przejdź do konta i multimediów')}</Text></Pressable> : null}
        {media?.failure?.retryable !== false && <Pressable accessibilityRole="button" onPress={() => { setMedia(undefined); setRetry((value) => value + 1); }} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={styles.statusTitle}>{t("Spróbuj ponownie")}</Text>
        </Pressable>}
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accentGold} />
        <Text style={styles.statusCopy}>{t("Pobieranie materiału…")}</Text>
      </View>
    );
  }

  if (isImage) return <Image key={`${filename}:${retry}`} accessibilityLabel={t("Materiał do pytania")} resizeMode="contain" source={{ uri }} style={styles.image} onLoad={() => markReady(true)} onError={playbackError} />;

  if (canPlay) return <VideoMedia key={`${filename}:${retry}`} examMode={examMode} onVideoEnd={onVideoEnd} uri={uri} onError={playbackError} onReadyChange={markReady} />;

  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>{t('Materiał niedostępny')}</Text>
      <Text style={styles.statusCopy}>{t('Nie udało się odtworzyć materiału. Spróbuj ponownie.')}</Text>
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
