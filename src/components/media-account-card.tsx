import { useTranslation } from '@/hooks/use-translation';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/context/app-theme-context';
import { supabase, supabaseConfigured } from '@/services/supabase';
import { signInExistingAccount, signOutLocalAccount } from '@/services/account';
import { validLoginEmail, accountErrorMessage } from '@/domain/account';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';

export function MediaAccountCard({ onAuthenticated }: { onAuthenticated?: () => void } = {}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const mounted = useRef(false);
  const lock = useRef(false);
  const revision = useRef(0);
  const passwordInput = useRef<TextInput>(null);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    try {
      const { data, error: readError } = await supabase.auth.getSession();
      if (readError) throw readError;
      if (mounted.current && request === revision.current) { setSession(data.session); setReady(true); setReadFailed(false); }
    } catch { if (mounted.current && request === revision.current) { setReady(true); setReadFailed(true); } }
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (!supabaseConfigured) return () => { mounted.current = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted.current) return;
      revision.current++;
      setSession(next); setReady(true); setReadFailed(false);
      if (next) { setPassword(''); setVisiblePassword(false); }
    });
    void Promise.resolve().then(refresh);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { mounted.current = false; subscription.unsubscribe(); foreground.remove(); };
  }, [refresh]);
  useFocusEffect(useCallback(() => {
    if (supabaseConfigured) void refresh();
    return () => { setPassword(''); setVisiblePassword(false); };
  }, [refresh]));
  const signIn = async () => {
    if (lock.current || !supabaseConfigured || readFailed) return;
    setSubmitted(true);
    if (!validLoginEmail(email) || !password) return;
    lock.current = true; setBusy(true); setError(null);
    const generation = userDataRevision();
    try {
      const result = await signInExistingAccount(email, password);
      if (!mounted.current || !userDataWritable(generation)) return;
      if (result.error) { setError(accountErrorMessage(result.error)); return; }
      if (!result.data.session) { setError(t("Nie potwierdzono logowania. Spróbuj ponownie.")); return; }
      revision.current++;
      setSession(result.data.session); setReady(true); setReadFailed(false);
      setPassword(''); setVisiblePassword(false); Keyboard.dismiss();
      onAuthenticated?.();
    } catch (failure) { if (mounted.current && userDataWritable(generation)) setError(accountErrorMessage(failure)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const signOut = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const { error: signOutError } = await signOutLocalAccount();
      if (signOutError) throw signOutError;
      const { data, error: readError } = await supabase.auth.getSession();
      if (readError || data.session) throw new Error('Sign-out not confirmed');
      if (mounted.current) { revision.current++; setSession(null); setPassword(''); setVisiblePassword(false); setReadFailed(false); }
    } catch (failure) { if (mounted.current) setError(accountErrorMessage(failure)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const s = StyleSheet.create({
    card: { borderRadius: 20, gap: 16, padding: 24, backgroundColor: colors.surface },
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary }, copy: { fontSize: 16, lineHeight: 24, color: colors.textSecondary },
    input: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, minHeight: 52, padding: 16, fontSize: 16 },
    button: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', minHeight: 52, padding: 12, backgroundColor: colors.primary },
    buttonText: { fontWeight: '700', color: colors.onPrimary, textAlign: 'center' }, secondary: { justifyContent: 'center', minHeight: 48 },
    link: { color: colors.primaryText, fontWeight: '700' }, error: { color: colors.error, lineHeight: 24 }, disabled: { opacity: 0.5 },
  });
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.title}>{t("Konto i dostęp do materiałów")}</Text>
    <Text style={s.copy}>{t("Postępy są lokalne. Konto nie synchronizuje ich ani nie tworzy kopii w chmurze.")}</Text>
    {!supabaseConfigured ? <Text style={s.copy}>{t("Logowanie nie jest dostępne w tej konfiguracji aplikacji.")}</Text>
      : !ready ? <Text accessibilityLiveRegion="polite" style={s.copy}>{t("Sprawdzamy zapisaną sesję…")}</Text>
      : readFailed ? <><Text accessibilityRole="alert" style={s.error}>{t("Nie udało się odczytać stanu konta.")}</Text><Pressable accessibilityRole="button" onPress={() => void refresh()} style={s.secondary}><Text style={s.link}>{t("Sprawdź ponownie")}</Text></Pressable></>
      : session ? <>
        <Text style={s.title}>{session.user.email ?? t('Zalogowane konto')}</Text>
        <Text style={s.copy}>{t("Sesja jest zapisana na urządzeniu. Serwer sprawdza dostęp przy pobieraniu każdego materiału.")}</Text>
        {onAuthenticated ? <Pressable accessibilityRole="button" disabled={busy} onPress={onAuthenticated} style={s.button}><Text style={s.buttonText}>{t("Wróć i ponów pobranie")}</Text></Pressable> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void signOut()} style={s.secondary}><Text style={s.link}>{busy ? t("Proszę czekać…") : t("Wyloguj z tego urządzenia")}</Text></Pressable>
        <Text style={s.copy}>{t("Wylogowanie nie usuwa postępów, cache ani konta na serwerze.")}</Text>
      </> : <>
        <Text style={s.copy}>{t("Zaloguj się istniejącym kontem, aby pobierać zdjęcia i filmy. Rejestracja i odzyskiwanie hasła nie są jeszcze dostępne w aplikacji.")}</Text>
        <TextInput accessibilityLabel="E-mail" autoCapitalize="none" autoComplete="email" autoCorrect={false} editable={!busy} keyboardType="email-address" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordInput.current?.focus()} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor={colors.textSecondary} style={s.input} value={email} />
        {submitted && !validLoginEmail(email) ? <Text accessibilityRole="alert" style={s.error}>{t("Wpisz poprawny adres e-mail.")}</Text> : null}
        <TextInput ref={passwordInput} accessibilityLabel={t("Hasło")} autoCapitalize="none" autoComplete="current-password" autoCorrect={false} editable={!busy} onChangeText={setPassword} onSubmitEditing={() => void signIn()} returnKeyType="go" placeholder={t("Hasło")} placeholderTextColor={colors.textSecondary} secureTextEntry={!visiblePassword} style={s.input} value={password} />
        {submitted && !password ? <Text accessibilityRole="alert" style={s.error}>{t("Wpisz hasło.")}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: visiblePassword, disabled: busy }} disabled={busy} onPress={() => setVisiblePassword(value => !value)} style={s.secondary}><Text style={s.link}>{visiblePassword ? t("Ukryj hasło") : t("Pokaż hasło")}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void signIn()} style={[s.button, busy && s.disabled]}><Text style={s.buttonText}>{busy ? t("Logowanie…") : t("Zaloguj się")}</Text></Pressable>
      </>}
    {error ? <Text accessibilityRole="alert" style={s.error}>{t(error)}</Text> : null}
  </View>;
}
