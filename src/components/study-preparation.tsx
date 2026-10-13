import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/app-theme-context';
import { useTranslation } from '@/hooks/use-translation';
import { createStudyPreparation, type StudyMediaQuestion } from '@/services/study-preparation';
import { protectMedia, releaseProtectedMedia } from '@/services/media-cache';
import { mediaFailure, type MediaFailure } from '@/domain/media-error';
import type { MediaPreloadProgress } from '@/services/media-preload';
import { MediaAccountCard } from '@/components/media-account-card';
import { AppButton, AppStatus } from '@/components/ui/app-controls';

export function StudyPreparation({ questions, category, startIndex = 0, onReady, onCancel }: {
  questions: readonly StudyMediaQuestion[]; category: string; startIndex?: number; onReady: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const group = useId();
  const controller = useMemo(() => createStudyPreparation(questions, startIndex), [questions, startIndex]);
  const [progress, setProgress] = useState<MediaPreloadProgress | null>(null);
  const [failure, setFailure] = useState<MediaFailure | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState(false);
  const epoch = useRef(0);
  const locked = useRef(false);
  const job = useRef<Promise<void> | null>(null);
  useEffect(() => {
    protectMedia(group, questions.flatMap(question => question.media_filename ? [question.media_filename] : []));
    return () => releaseProtectedMedia(group);
  }, [group, questions]);
  const run = useCallback(() => {
    if (locked.current) return job.current;
    locked.current = true;
    const request = ++epoch.current;
    setBusy(true); setReady(false); setFailure(null); setAccount(false);
    job.current = (async () => { try {
      const completed = await controller.run(setProgress);
      if (request === epoch.current) setReady(completed);
    } catch (error) {
      if (request === epoch.current) setFailure(mediaFailure(error));
    } finally {
      locked.current = false;
      if (request === epoch.current) setBusy(false);
    } })();
    return job.current;
  }, [controller]);
  useFocusEffect(useCallback(() => {
    // Defer state changes until after focus; a blurred old request cannot open a question.
    const request = ++epoch.current;
    void Promise.resolve(job.current).then(() => { if (request === epoch.current) void run(); });
    return () => { epoch.current++; controller.cancel(); };
  }, [controller, run]));
  const cancel = () => { epoch.current++; controller.cancel(); onCancel(); };
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
    title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
    copy: { color: colors.textSecondary, lineHeight: 24 },
  });
  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={s.title}>{t('Przygotowanie nauki')}</Text>
        <Text style={s.copy}>{t('Kategoria')} {category} · {t('Partia: {0} pytań', [questions.length])}</Text>
        <Text style={s.copy}>{t('Przygotujemy pierwsze materiały. Kolejne pobierzemy w tle podczas nauki. Ponowienie zachowa wybrane pytania.')}</Text>
        <AppStatus tone={ready ? 'success' : 'info'} message={ready ? t('Materiały startowe gotowe. Możesz rozpocząć naukę.') : progress ? t('Materiały: {0}/{1}', [progress.completed, progress.total]) : t('Sprawdzanie materiałów…')} />
        {failure && <AppStatus tone="error" message={t(failure.message)} />}
        {failure?.kind === 'account' && !account && <AppButton label={t('Zaloguj się do materiałów')} onPress={() => setAccount(true)} />}
        {account && <MediaAccountCard onAuthenticated={() => void run()} />}
        {(failure?.kind === 'access' || failure?.kind === 'storage') && <AppButton variant="link" label={t('Przejdź do konta i multimediów')} onPress={() => router.navigate('/settings')} />}
        {ready && <AppButton label={t('Rozpocznij naukę')} onPress={onReady} />}
        {!ready && !busy && failure?.kind !== 'account' && <AppButton label={t('Spróbuj ponownie')} onPress={() => void run()} />}
        <AppButton variant="link" label={busy ? t('Przerwij przygotowanie') : t('Wróć do menu Nauki')} onPress={cancel} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
