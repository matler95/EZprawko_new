import { useTranslation } from '@/hooks/use-translation';
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useCallback, useMemo, useRef, useState } from "react";
import { BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Link, router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { findSigns, roadSigns, signGroups, type RoadSign, type SignGroup } from "@/domain/road-signs";
import { signImages } from "@/constants/sign-images";
import { signQuestionCounts } from "@/database/signs";
import { useTargetCategory } from '@/context/target-category-context';

export default function SignsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = createStyles(colors);
  const [search, setSearch] = useState("");
  const db = useSQLiteContext();
  const { category } = useTargetCategory();
  const [group, setGroup] = useState<SignGroup | null>(null);
  const [selected, setSelected] = useState<RoadSign | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState(false);
  const [countReading, setCountReading] = useState(true);
  const countRequest = useRef(0);
  const focused = useRef(false);
  const refreshCounts = useCallback(async () => {
    const request = ++countRequest.current;
    setCountReading(true);
    try {
      const value = await signQuestionCounts(db, category);
      if (focused.current && request === countRequest.current) { setCounts(value); setError(false); }
    } catch { if (focused.current && request === countRequest.current) setError(true); }
    finally { if (focused.current && request === countRequest.current) setCountReading(false); }
  }, [category, db]);
  useFocusEffect(useCallback(() => {
    if (!selected) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setSelected(null); return true; });
    return () => subscription.remove();
  }, [selected]));
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void refreshCounts();
    return () => { focused.current = false; countRequest.current++; };
  }, [refreshCounts]));
  const items = useMemo(() => findSigns(search, group), [group, search]);
  if (selected) return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={s.back}><Text style={s.link}>{t("← Wróć do znaków")}</Text></Pressable>
    <Text accessibilityRole="header" style={s.title}>{selected.code}</Text>
    <Text style={s.name}>{selected.name}</Text>
    <View style={s.artwork}><Image source={signImages[selected.code]} contentFit="contain" style={s.largeImage} accessibilityLabel={t("Wzór znaku {0}", [selected.code])} /></View>
    <Text style={s.sub}>{t(signGroups[selected.group])} {t("· urzędowy wzór, strona")} {selected.sourcePage}</Text>
    <Link href={selected.source} style={s.back}><Text style={s.link}>{t("Otwórz źródło w Dzienniku Ustaw ↗")}</Text></Link>
    {countReading ? <Text accessibilityLiveRegion="polite" style={s.sub}>{t('Sprawdzanie powiązanych pytań…')}</Text> : error ? <><Text accessibilityRole="alert" style={s.sub}>{t('Nie udało się odczytać powiązanych pytań. Spróbuj ponownie.')}</Text><Pressable accessibilityRole="button" style={s.back} onPress={() => void refreshCounts()}><Text style={s.link}>{t('Spróbuj ponownie')}</Text></Pressable></> : counts[selected.code] ? <>
      <Text style={s.sub}>{t("Powiązane pytania:")} {counts[selected.code]}{t(". Kod wskazany w treści pytania lub nazwie materiału.")}</Text>
      <Pressable accessibilityRole="button" style={s.cta} onPress={() => router.push({ pathname: "/study", params: { sign: selected.code, filter: "all", topic: undefined, count: "12", session: undefined, start: undefined } })}><Text style={s.ctaText}>{t("Ćwicz pytania z tym znakiem →")}</Text></Pressable>
    </> : <>
      <Text style={s.sub}>{t("Brak zweryfikowanych powiązań z pytaniami. Nie oznacza to, że znak nie występuje w bazie.")}</Text>
      <Pressable accessibilityRole="button" style={s.cta} onPress={() => router.push({ pathname: "/study", params: { topic: "Znaki i sygnały drogowe", filter: "all", sign: undefined, session: undefined, count: undefined, start: undefined } })}><Text style={s.ctaText}>{t("Ćwicz dział: znaki i sygnały →")}</Text></Pressable>
    </>}
  </ScrollView></SafeAreaView>;
  return <SafeAreaView style={s.safe}><FlatList
    data={items} keyExtractor={(item) => item.code} initialNumToRender={12} windowSize={7}
    keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}
    ListHeaderComponent={<View style={s.header}>
      <Text accessibilityRole="header" style={s.title}>{t("Leksykon znaków")}</Text>
      <Text style={s.sub}>{roadSigns.length} {t("wzorów A/B/C/D/T dostępnych offline. Dotknij znaku, aby go powiększyć i przejść do nauki.")}</Text>
      <TextInput accessibilityLabel={t("Szukaj znaku po kodzie lub nazwie")} value={search} onChangeText={setSearch} placeholder={t("Szukaj, np. B20 lub STOP")} placeholderTextColor={colors.textSecondary} style={s.search} />
      <View style={s.filters}>{([null, "A", "B", "C", "D", "T"] as const).map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: group === item }} key={item ?? "all"} onPress={() => setGroup(item)} style={[s.filter, group === item && s.active]}><Text style={[s.filterText, group === item && s.activeText]}>{item ? `${item} · ${t(signGroups[item])}` : t("Wszystkie")}</Text></Pressable>)}</View>
      <Text style={s.sub}>{t('Nazwy znaków i treści źródłowe są po polsku.')}</Text>
      <Text style={s.sub}>{t("Wyniki:")} {items.length}</Text>
    </View>}
    ListEmptyComponent={<View style={s.header}><Text style={s.sub}>{t("Nie znaleziono znaku. Spróbuj podać kod lub krótszą nazwę.")}</Text><Pressable accessibilityRole="button" style={s.back} onPress={() => { setSearch(""); setGroup(null); }}><Text style={s.link}>{t("Pokaż wszystkie znaki")}</Text></Pressable></View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.code}, ${item.name}`} onPress={() => setSelected(item)} style={s.card}>
      <View style={s.thumbnail}><Image source={signImages[item.code]} contentFit="contain" style={s.image} /></View>
      <View style={s.description}><Text style={s.code}>{item.code}</Text><Text style={s.name}>{item.name}</Text><Text style={s.type}>{t(signGroups[item.group])}{!countReading && !error && counts[item.code] ? ` · ${t('Pytania:')} ${counts[item.code]}` : ""}</Text></View>
      <Text style={s.link}>›</Text>
    </Pressable>}
  /></SafeAreaView>;
}
const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 12, maxWidth: 600, width: '100%', alignSelf: 'center' },
  header: { gap: 12 }, title: { fontSize: 30, fontWeight: "700", color: colors.textPrimary },
  sub: { color: colors.textSecondary, lineHeight: 20 },
  search: { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border, borderRadius: 16, borderWidth: 1, minHeight: 48, paddingHorizontal: 16 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: { backgroundColor: colors.primarySurface, borderRadius: 12, minHeight: 48, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 8 },
  filterText: { color: colors.primaryText }, active: { backgroundColor: colors.primary }, activeText: { color: colors.onPrimary },
  card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 20, flexDirection: "row", gap: 12, padding: 16 },
  description: { flex: 1, gap: 4 }, thumbnail: { backgroundColor: "#FFFFFF", borderRadius: 12, overflow: "hidden" },
  image: { height: 80, width: 80 }, artwork: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16 },
  largeImage: { height: 280, width: "100%" }, code: { color: colors.primaryText, fontWeight: "700" },
  name: { color: colors.textPrimary, fontWeight: "700", lineHeight: 20 }, type: { color: colors.textSecondary, fontSize: 12 },
  link: { color: colors.primaryText, fontWeight: "700" }, back: { minHeight: 48, justifyContent: "center", paddingVertical: 12 },
  cta: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 58, justifyContent: "center", alignItems: "center", padding: 16 },
  ctaText: { color: colors.onPrimary, fontWeight: "700", textAlign: "center" },
});
