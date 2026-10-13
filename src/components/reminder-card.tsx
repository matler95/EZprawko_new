import { useTranslation } from '@/hooks/use-translation';
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { openSettings } from "expo-linking";
import { AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { formatReminderTime, type ReminderTime } from "@/domain/reminder-time";
import { readDailyReminder, updateDailyReminder } from "@/services/reminders";

type ReminderState = Awaited<ReturnType<typeof readDailyReminder>>;
function pickerDate(time: ReminderTime) { return new Date(2020, 0, 1, time.hour, time.minute); }

export function ReminderCard() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { colors, preference } = useAppTheme();
  const system = useColorScheme();
  const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
  const s = styles(colors);
  const supported = Platform.OS === 'ios' || Platform.OS === 'android';
  const [state, setState] = useState<ReminderState | null>(null);
  const [reading, setReading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(() => pickerDate({ hour: 19, minute: 0 }));
  const lock = useRef(false);
  const focused = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setReading(true);
    try {
      const next = await readDailyReminder(db);
      if (focused.current && id === request.current) { setState(next); setReadError(false); setBusy(lock.current); }
    } catch { if (focused.current && id === request.current) setReadError(true); }
    finally { if (focused.current && id === request.current) setReading(false); }
  }, [db]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!supported) return () => { focused.current = false; };
    void refresh();
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') void refresh(); });
    return () => {
      focused.current = false; ++request.current; subscription.remove();
      if (Platform.OS === 'android') void DateTimePickerAndroid.dismiss('time').catch(() => undefined);
    };
  }, [refresh, supported]));

  const save = async (time: ReminderTime, enabled: boolean, ask = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    const id = ++request.current;
    try {
      const next = await updateDailyReminder(db, time, enabled, ask);
      if (focused.current && id === request.current) setState(next);
    } catch (failure) {
      if (focused.current) {
        setError(failure instanceof Error ? failure.message : t("Nie udało się zmienić przypomnienia. Spróbuj ponownie."));
        void refresh();
      }
    } finally { lock.current = false; if (focused.current) setBusy(false); }
  };
  const openPicker = () => {
    if (!state || lock.current) return;
    const date = pickerDate(state.time);
    if (Platform.OS === 'android') {
      try {
        DateTimePickerAndroid.open({ value: date, mode: 'time', is24Hour: true,
          onValueChange: (_event, selected) => { if (focused.current) void save({ hour: selected.getHours(), minute: selected.getMinutes() }, state.enabled); },
        });
      } catch { setError('Nie udało się otworzyć zegara. Sprawdź, czy używasz aktualnego buildu aplikacji.'); }
    } else { setDraft(date); setPickerOpen(true); }
  };

  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>{t("Codzienna powtórka")}</Text>
    {!supported ? <Text style={s.detail}>{t("Lokalne przypomnienia i wybór godziny są dostępne na Androidzie i iOS.")}</Text> : reading ? <Text accessibilityRole="alert" style={s.detail}>{t("Sprawdzanie przypomnień…")}</Text> : readError || !state ? <>
      <Text style={s.detail}>{t("Nie udało się odczytać przypomnień.")}</Text>
      <Pressable accessibilityRole="button" style={s.button} onPress={() => void refresh()}><Text style={s.action}>{t("Spróbuj ponownie")}</Text></Pressable>
    </> : <>
      <Text style={s.detail}>{state.enabled ? t("Włączone") : t("Wyłączone")} {t("· codziennie o")} {formatReminderTime(state.time)} {t("· czas lokalny telefonu")}</Text>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={t("Zmień godzinę przypomnienia, obecnie {0}", [formatReminderTime(state.time)])} style={s.button} onPress={openPicker}><Text style={s.action}>{t("Zmień godzinę ·")} {formatReminderTime(state.time)}</Text></Pressable>
      <Pressable disabled={busy} accessibilityRole="switch" accessibilityState={{ checked: state.enabled, disabled: busy, busy }} style={s.button} onPress={() => void save(state.time, !state.enabled, !state.enabled)}><Text style={s.action}>{busy ? t("Zapisywanie…") : state.enabled ? t("Wyłącz przypomnienie") : t("Włącz przypomnienie")}</Text></Pressable>
      {!state.permissionGranted && <Pressable accessibilityRole="link" style={s.button} onPress={() => { void openSettings().catch(() => setError(t("Nie udało się otworzyć ustawień systemowych. Otwórz je ręcznie."))); }}><Text style={s.action}>{t("Ustawienia powiadomień w systemie ↗")}</Text></Pressable>}
      {state.scheduleCount > 1 && <Text style={s.detail}>{t("Wykryto kilka zapisanych przypomnień. Zapisz godzinę ponownie, aby uporządkować harmonogram.")}</Text>}
      <Text style={s.detail}>{t("Zmiana godziny przy wyłączonej funkcji nie włącza powiadomień. Dostarczenie może być opóźnione przez system, tryb skupienia lub oszczędzanie baterii.")}</Text>
    </>}
    {error && <Text accessibilityRole="alert" style={s.error}>{t(error)}</Text>}
    <Modal visible={pickerOpen && Platform.OS === 'ios'} animationType="slide" onRequestClose={() => setPickerOpen(false)} presentationStyle="pageSheet">
      <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.modal}>
        <Text accessibilityRole="header" style={s.heading}>{t("Godzina nauki")}</Text>
        <Text style={s.detail}>{t("Codziennie o")} {formatReminderTime({ hour: draft.getHours(), minute: draft.getMinutes() })}{t(", według czasu telefonu.")}</Text>
        {pickerOpen && <DateTimePicker value={draft} mode="time" display="spinner" themeVariant={dark ? 'dark' : 'light'} textColor={colors.textPrimary} onValueChange={(_event, date) => setDraft(date)} />}
        <Pressable accessibilityRole="button" style={s.button} onPress={() => { setPickerOpen(false); if (state) void save({ hour: draft.getHours(), minute: draft.getMinutes() }, state.enabled); }}><Text style={s.action}>{t("Zapisz godzinę")}</Text></Pressable>
        <Pressable accessibilityRole="button" style={s.button} onPress={() => setPickerOpen(false)}><Text style={s.action}>{t("Anuluj")}</Text></Pressable>
      </ScrollView></SafeAreaView>
    </Modal>
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  card: { padding: 24, gap: 12, borderRadius: 24, backgroundColor: colors.surface },
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  detail: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  button: { minHeight: 48, justifyContent: 'center', paddingVertical: 12 },
  action: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  error: { color: colors.error, fontSize: 14, lineHeight: 20 },
  safe: { flex: 1, backgroundColor: colors.background },
  modal: { padding: 24, gap: 16 },
});
