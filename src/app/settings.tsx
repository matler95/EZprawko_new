import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  dailyReminderIdentifier,
  selectedCategory,
  setDailyReminderIdentifier,
  setSelectedCategory,
} from "@/database/repository";
import { useSQLiteContext } from "expo-sqlite";
import { cacheSizeBytes, clearMediaCache } from "@/services/media-cache";
import { MediaDownloadCard } from "@/components/media-download-card";
import {
  disableDailyReminder,
  enableDailyReminder,
} from "@/services/reminders";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { MediaAccountCard } from "@/components/media-account-card";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { preference, setPreference, colors } = useAppTheme();
  const s = createStyles(colors);
  const [cache, setCache] = useState(0);
  const [reminder, setReminder] = useState<string | false>(false);
  const [category, setCategory] = useState("B");
  const refresh = () => cacheSizeBytes().then(setCache);
  useEffect(() => {
    refresh();
    selectedCategory(db).then(setCategory);
    dailyReminderIdentifier(db).then(setReminder);
  }, [db]);
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Ustawienia</Text>
        <MediaAccountCard />
        <Text style={s.heading}>Wygląd</Text>
        <View style={s.categories}>
          {(["system", "light", "dark"] as const).map((item) => (
            <Pressable key={item} onPress={() => setPreference(item)} style={[s.category, preference === item && s.categoryActive]}>
              <Text style={preference === item ? s.categoryTextActive : s.categoryText}>{item === "system" ? "System" : item === "light" ? "Jasny" : "Ciemny"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.heading}>Kategoria egzaminu</Text>
        <View style={s.categories}>
          {["AM", "A", "B", "C", "D"].map((item) => (
            <Pressable
              key={item}
              onPress={async () => {
                await setSelectedCategory(db, item);
                setCategory(item);
              }}
              style={[s.category, category === item && s.categoryActive]}
            >
              <Text
                style={
                  category === item ? s.categoryTextActive : s.categoryText
                }
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.sub}>
          Wybrana kategoria określa 12 pytań specjalistycznych.
        </Text>
        <Text style={s.heading}>Multimedia</Text>
        <MediaDownloadCard />
        <View style={s.card}>
          <View>
            <Text style={{ color: colors.textPrimary }}>Cache mediów</Text>
            <Text style={s.sub}>
              {(cache / 1024 / 1024).toFixed(1)} MB · limit 1 GB
            </Text>
          </View>
          <Pressable
            onPress={async () => {
              await clearMediaCache();
              refresh();
            }}
          >
            <Text style={s.action}>Wyczyść</Text>
          </Pressable>
        </View>
        <Text style={s.heading}>Przypomnienia</Text>
        <View style={s.card}>
          <View>
            <Text style={{ color: colors.textPrimary }}>Codzienna powtórka</Text>
            <Text style={s.sub}>Codziennie o 19:00</Text>
          </View>
          <Pressable
            onPress={async () => {
              if (reminder) {
                await disableDailyReminder(reminder);
                await setDailyReminderIdentifier(db, false);
                setReminder(false);
              } else {
                const identifier = await enableDailyReminder();
                if (identifier) await setDailyReminderIdentifier(db, identifier);
                setReminder(identifier);
              }
            }}
          >
            <Text style={s.action}>{reminder ? "Wyłącz" : "Włącz"}</Text>
          </Pressable>
        </View>
        <Text style={s.note}>
          Media pozostają prywatne, dopóki nie skonfigurujesz zatwierdzonego
          CDN.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: "700", color: colors.textPrimary },
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 16 },
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categories: { flexDirection: "row", gap: 8 },
  category: { backgroundColor: colors.primarySurface, padding: 12, borderRadius: 12 },
  categoryActive: { backgroundColor: colors.primary },
  categoryText: { color: colors.primaryText, fontWeight: "800" },
  categoryTextActive: { color: colors.onPrimary, fontWeight: "800" },
  sub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  action: { color: colors.primaryText, fontWeight: "700" },
  note: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 16 },
});
