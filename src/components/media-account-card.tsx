import { useTranslation } from '@/hooks/use-translation';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, StyleSheet, Text, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/context/app-theme-context';
import { supabase, supabaseConfigured } from '@/services/supabase';
import { signInExistingAccount, signOutLocalAccount } from '@/services/account';
import { validLoginEmail, accountErrorMessage } from '@/domain/account';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { AppButton, AppCard, AppStatus } from '@/components/ui/app-controls';

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
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary }, copy: { fontSize: 16, lineHeight: 24, color: colors.textSecondary },
    input: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, minHeight: 52, padding: 16, fontSize: 16 },
  });
  return <AppCard>
    <Text accessibilityRole="header" style={s.title}>{t("Konto i dostęp do materiałów")}</Text>
    <Text style={s.copy}>{t("Postępy są lokalne. Konto nie synchronizuje ich ani nie tworzy kopii w chmurze.")}</Text>
    {!supabaseConfigured ? <Text style={s.copy}>{t("Logowanie nie jest dostępne w tej konfiguracji aplikacji.")}</Text>
      : !ready ? <AppStatus message={t("Sprawdzamy zapisaną sesję…")} />
      : readFailed ? <><AppStatus tone="error" message={t("Nie udało się odczytać stanu konta.")} /><AppButton variant="link" label={t("Sprawdź ponownie")} onPress={() => void refresh()} /></>
      : session ? <>
        <Text style={s.title}>{session.user.email ?? t('Zalogowane konto')}</Text>
        <Text style={s.copy}>{t("Sesja jest zapisana na urządzeniu. Serwer sprawdza dostęp przy pobieraniu każdego materiału.")}</Text>
        {onAuthenticated ? <AppButton disabled={busy} label={t("Wróć i ponów pobranie")} onPress={onAuthenticated} /> : null}
        <AppButton variant="link" busy={busy} label={busy ? t("Proszę czekać…") : t("Wyloguj z tego urządzenia")} onPress={() => void signOut()} />
        <Text style={s.copy}>{t("Wylogowanie nie usuwa postępów, cache ani konta na serwerze.")}</Text>
      </> : <>
        <Text style={s.copy}>{t("Zaloguj się istniejącym kontem, aby pobierać zdjęcia i filmy. Rejestracja i odzyskiwanie hasła nie są jeszcze dostępne w aplikacji.")}</Text>
        <TextInput accessibilityLabel="E-mail" autoCapitalize="none" autoComplete="email" autoCorrect={false} editable={!busy} keyboardType="email-address" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordInput.current?.focus()} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor={colors.textSecondary} style={s.input} value={email} />
        {submitted && !validLoginEmail(email) ? <AppStatus tone="error" message={t("Wpisz poprawny adres e-mail.")} /> : null}
        <TextInput ref={passwordInput} accessibilityLabel={t("Hasło")} autoCapitalize="none" autoComplete="current-password" autoCorrect={false} editable={!busy} onChangeText={setPassword} onSubmitEditing={() => void signIn()} returnKeyType="go" placeholder={t("Hasło")} placeholderTextColor={colors.textSecondary} secureTextEntry={!visiblePassword} style={s.input} value={password} />
        {submitted && !password ? <AppStatus tone="error" message={t("Wpisz hasło.")} /> : null}
        <AppButton variant="link" accessibilityState={{ expanded: visiblePassword }} disabled={busy} label={visiblePassword ? t("Ukryj hasło") : t("Pokaż hasło")} onPress={() => setVisiblePassword(value => !value)} />
        <AppButton busy={busy} label={busy ? t("Logowanie…") : t("Zaloguj się")} onPress={() => void signIn()} />
      </>}
    {error ? <AppStatus tone="error" message={t(error)} /> : null}
  </AppCard>;
}
