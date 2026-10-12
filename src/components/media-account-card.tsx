import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/context/app-theme-context";
import { supabase, supabaseConfigured } from "@/services/supabase";

export function MediaAccountCard() {
  const { colors } = useAppTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        setError("Nie udało się zalogować. Sprawdź e-mail i hasło oraz połączenie z internetem.");
      } else {
        setPassword("");
      }
    } catch {
      setError("Nie udało się połączyć. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signOut({ scope: "local" });
      if (authError) setError("Nie udało się wylogować. Spróbuj ponownie.");
    } catch {
      setError("Nie udało się wylogować. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Konto</Text>
      {!supabaseConfigured ? (
        <Text style={{ color: colors.textSecondary }}>Logowanie nie jest jeszcze dostępne.</Text>
      ) : !ready ? (
        <Text style={{ color: colors.textSecondary }}>Sprawdzamy konto…</Text>
      ) : session ? (
        <>
          <Text style={{ color: colors.textPrimary }}>{session.user.email}</Text>
          <Text style={{ color: colors.textSecondary }}>Możesz pobierać multimedia do pytań.</Text>
          <Pressable disabled={busy} onPress={() => void signOut()} style={styles.secondary}>
            <Text style={{ color: colors.primary }}>{busy ? "Proszę czekać…" : "Wyloguj się"}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: colors.textSecondary }}>Zaloguj się, aby pobierać zdjęcia i filmy do pytań.</Text>
          <TextInput
            accessibilityLabel="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!busy}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="E-mail"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            value={email}
          />
          <TextInput
            accessibilityLabel="Hasło"
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            editable={!busy}
            onChangeText={setPassword}
            onSubmitEditing={() => void signIn()}
            placeholder="Hasło"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            value={password}
          />
          <Pressable disabled={busy || !email.trim() || !password} onPress={() => void signIn()} style={[styles.button, { backgroundColor: colors.primary, opacity: busy || !email.trim() || !password ? 0.5 : 1 }]}>
            <Text style={styles.buttonText}>{busy ? "Logowanie…" : "Zaloguj się"}</Text>
          </Pressable>
        </>
      )}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, gap: 12, padding: 24 },
  title: { fontSize: 18, fontWeight: "700" },
  input: { borderRadius: 12, borderWidth: 1, minHeight: 48, paddingHorizontal: 16 },
  button: { alignItems: "center", borderRadius: 12, justifyContent: "center", minHeight: 52 },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  secondary: { justifyContent: "center", minHeight: 44 },
});
