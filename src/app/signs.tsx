import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const signs = [
  ["A-7", "Ustąp pierwszeństwa", "Ostrzegawczy"], ["A-17", "Dzieci", "Ostrzegawczy"], ["A-30", "Inne niebezpieczeństwo", "Ostrzegawczy"],
  ["B-20", "STOP", "Zakazu"], ["B-33", "Ograniczenie prędkości", "Zakazu"], ["B-36", "Zakaz zatrzymywania się", "Zakazu"],
  ["C-12", "Ruch okrężny", "Nakazu"], ["C-2", "Nakaz jazdy w prawo", "Nakazu"],
  ["D-1", "Droga z pierwszeństwem", "Informacyjny"], ["D-6", "Przejście dla pieszych", "Informacyjny"], ["D-42", "Obszar zabudowany", "Informacyjny"],
  ["T-1", "Odległość znaku od miejsca niebezpiecznego", "Tabliczka"],
] as const;

export default function SignsScreen() {
  const { colors } = useAppTheme();
  const s = createStyles(colors);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const items = useMemo(() => signs.filter(([code, name, type]) => (!group || type === group) && `${code} ${name}`.toLowerCase().includes(search.toLowerCase())), [group, search]);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.title}>Leksykon znaków</Text><Text style={s.sub}>Szybka powtórka kodów i nazw znaków drogowych.</Text>
    <TextInput value={search} onChangeText={setSearch} placeholder="Szukaj, np. B-20 lub STOP" placeholderTextColor={colors.textSecondary} style={s.search} />
    <View style={s.filters}>{[null, "Ostrzegawczy", "Zakazu", "Nakazu", "Informacyjny", "Tabliczka"].map((item) => <Pressable key={item ?? "all"} onPress={() => setGroup(item)}><Text style={[s.filter, group === item && s.active]}>{item ?? "Wszystkie"}</Text></Pressable>)}</View>
    {items.map(([code, name, type]) => <View key={code} style={s.card}><View style={s.symbol}><Text style={s.code}>{code}</Text></View><View><Text style={s.name}>{name}</Text><Text style={s.type}>{type}</Text></View></View>)}
  </ScrollView></SafeAreaView>;
}
const createStyles = (colors: AppTheme) => StyleSheet.create({ safe:{flex:1,backgroundColor: colors.background},content:{padding:24,gap:12},title:{fontSize:30,fontWeight:"800",color: colors.textPrimary},sub:{color: colors.textSecondary,lineHeight:20},search:{backgroundColor: colors.surface,borderColor: colors.border,borderRadius:14,borderWidth:1,minHeight:48,paddingHorizontal:16},filters:{flexDirection:"row",flexWrap:"wrap",gap:8},filter:{backgroundColor: colors.primarySurface,borderRadius:12,color: colors.primaryText,paddingHorizontal:12,paddingVertical:8},active:{backgroundColor: colors.primary,color: colors.onPrimary},card:{alignItems:"center",backgroundColor: colors.surface,borderRadius:18,flexDirection:"row",gap:16,padding:16},symbol:{alignItems:"center",borderColor: colors.error,borderRadius:28,borderWidth:4,height:56,justifyContent:"center",width:56},code:{fontSize:11,fontWeight:"800",textAlign:"center"},name:{color: colors.textPrimary,fontWeight:"800"},type:{color: colors.textSecondary,fontSize:12,marginTop:4} });
