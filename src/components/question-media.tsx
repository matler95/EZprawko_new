import { useTranslation } from '@/hooks/use-translation';
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useEvent, useEventListener } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { deliveredMediaFilename, mediaConfig } from '@/config/media';
import { cachedMediaUri } from '@/services/media-cache';
import { mediaFailure, type MediaFailure } from '@/domain/media-error';
import { MediaAccountCard } from '@/components/media-account-card';
import { recordMediaDiagnostic } from '@/services/media-diagnostics';

type QuestionMediaProps = {
  questionId?: number;
  filename?: string | null;
  examMode?: boolean;
  onVideoEnd?: (finishedAt?: number) => void;
  onReadyChange?: (ready: boolean) => void;
  examPlayback?: 'waiting' | 'playing' | 'finished';
  videoStartedAt?: number;
  onVideoDuration?: (duration: number) => void;
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
  examPlayback = 'waiting',
  videoStartedAt,
  onVideoDuration,
}: {
  uri: string;
  examMode?: boolean;
  onVideoEnd?: (finishedAt?: number) => void;
  onError?: () => void;
  onReadyChange: (ready: boolean) => void;
  examPlayback?: 'waiting' | 'playing' | 'finished';
  videoStartedAt?: number;
  onVideoDuration?: (duration: number) => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const started = useRef(false);
  const ended = useRef(false);
  const styles = createStyles(colors);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.showNowPlayingNotification = false;
  });
  useEventListener(player, 'playToEnd', () => {
    if (!ended.current) { ended.current = true; onVideoEnd?.(Date.now()); }
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEffect(() => {
    onReadyChange(status === 'readyToPlay');
    if (status === 'error') onError?.();
  }, [status, onReadyChange, onError]);
  useEffect(() => {
    if (status === 'readyToPlay' && player.duration > 0) onVideoDuration?.(player.duration);
  }, [status, player, onVideoDuration]);
  useEffect(() => {
    if (!examMode || status !== 'readyToPlay') return;
    if (examPlayback === 'finished') {
      player.pause();
      if (!ended.current) {
        ended.current = true;
        player.seekBy(Math.max(0, player.duration - 0.04) - player.currentTime);
        onVideoEnd?.();
      }
    } else if (examPlayback === 'playing' && !started.current && !ended.current) {
      started.current = true;
      const elapsed = videoStartedAt ? Math.max(0, (Date.now() - videoStartedAt) / 1000) : 0;
      if (elapsed >= player.duration) {
        ended.current = true; player.seekBy(Math.max(0, player.duration - 0.04) - player.currentTime);
        onVideoEnd?.(videoStartedAt! + player.duration * 1000);
      } else {
        player.seekBy((elapsed < 1 ? 0 : elapsed) - player.currentTime);
        player.play();
      }
    }
  }, [examMode, examPlayback, onVideoEnd, player, status, videoStartedAt]);
  useEffect(() => {
    if (!examMode || !videoStartedAt) return;
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active' || examPlayback !== 'playing' || ended.current || status !== 'readyToPlay') return;
      const elapsed = Math.max(0, (Date.now() - videoStartedAt) / 1000);
      if (elapsed >= player.duration) {
        ended.current = true; player.pause(); player.seekBy(Math.max(0, player.duration - 0.04) - player.currentTime);
        onVideoEnd?.(videoStartedAt + player.duration * 1000);
      } else { player.seekBy(Math.max(player.currentTime, elapsed) - player.currentTime); player.play(); }
    });
    return () => app.remove();
  }, [examMode, examPlayback, onVideoEnd, player, status, videoStartedAt]);

  return (
    <View>
    <VideoView
      contentFit="contain"
      nativeControls={!examMode}
      fullscreenOptions={{ enable: !examMode }}
      allowsPictureInPicture={false}
      allowsVideoFrameAnalysis={!examMode}
      pointerEvents={examMode ? 'none' : 'auto'}
      player={player}
      style={[styles.video, examMode && examPlayback === 'waiting' && { opacity: 0 }]}
    />
    {!examMode && <Pressable accessibilityRole="button" accessibilityLabel={t('Odtwórz ponownie')} disabled={status !== 'readyToPlay'}
      onPress={() => { ended.current = false; player.replay(); player.play(); }} style={{ minHeight: 48, justifyContent: 'center', marginBottom: 16 }}>
      <Text style={styles.statusTitle}>{t('Odtwórz ponownie')}</Text>
    </Pressable>}
    </View>
  );
}

export function QuestionMedia({ questionId, filename, examMode, examPlayback, videoStartedAt, onVideoDuration, onVideoEnd, onReadyChange }: QuestionMediaProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [retry, setRetry] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const requestKey = `${questionId ?? ''}:${filename ?? ''}:${retry}`;
  const decode = useRef({key:'',startedAt:0});
  const [media, setMedia] = useState<{
    requestKey: string;
    filename: string;
    uri?: string;
    error?: string;
    failure?: MediaFailure;
    decoded?: boolean;
  }>();
  const markReady = useCallback((decoded: boolean) => {
    if (decoded && decode.current.key === requestKey && decode.current.startedAt) {
      recordMediaDiagnostic({stage:'decode',kind:filename && playableVideoExtensions.has(extension(deliveredMediaFilename(filename)))?'video':'image',
        elapsedMs:Date.now()-decode.current.startedAt,questionId,status:'ok'});
      decode.current.startedAt = 0;
    }
    setMedia(current => current && current.requestKey === requestKey && current.uri && !current.error && current.decoded !== decoded
      ? { ...current, decoded } : current);
  }, [filename, questionId, requestKey]);
  const playbackError = useCallback(() => {
    recordMediaDiagnostic({stage:'decode',kind:filename && playableVideoExtensions.has(extension(deliveredMediaFilename(filename)))?'video':'image',elapsedMs:0,questionId,status:'error'});
    setMedia(current => current && current.requestKey === requestKey
      ? { requestKey, filename: current.filename, error: 'Nie udało się odtworzyć materiału. Spróbuj ponownie.' } : current);
  }, [filename, questionId, requestKey]);
  useEffect(() => {
    onReadyChange?.(!filename || Boolean(media?.requestKey === requestKey && media.uri && media.decoded && !media.error));
  }, [filename, media, onReadyChange, requestKey]);

  useEffect(() => {
    let active = true;

    if (!filename || !mediaConfig.enabled) return;

    cachedMediaUri(filename)
      .then((value) => {
        if (!value) throw new Error('Missing media');
        if (active) { decode.current = {key:requestKey,startedAt:Date.now()}; setMedia({ requestKey, filename, uri: value, decoded: false }); }
      })
      .catch((reason: unknown) => {
        if (active) {
          const failure = mediaFailure(reason);
          setMedia({
            requestKey,
            filename,
            error: failure.message,
            failure,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [filename, requestKey, t]);

  if (!filename) return null;

  const uri = media?.requestKey === requestKey ? media.uri : undefined;
  const error = media?.requestKey === requestKey ? media.error : undefined;

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

  if (isImage) return <Image key={requestKey} accessibilityLabel={t("Materiał do pytania")} resizeMode="contain" source={{ uri }} style={styles.image} onLoad={() => markReady(true)} onError={playbackError} />;

  if (canPlay) return <VideoMedia key={requestKey} examMode={examMode} examPlayback={examPlayback} videoStartedAt={videoStartedAt} onVideoDuration={onVideoDuration} onVideoEnd={onVideoEnd} uri={uri} onError={playbackError} onReadyChange={markReady} />;

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
