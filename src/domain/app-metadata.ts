export function appMetadata(input: { isExpoGo: boolean; configVersion?: string; nativeVersion: string | null; nativeBuild: string | null }) {
  return input.isExpoGo ? {
    version: input.configVersion ?? "Nieustalona",
    build: "Expo Go — brak buildu EZprawko",
  } : {
    version: input.nativeVersion ?? input.configVersion ?? "Nieustalona",
    build: input.nativeBuild ?? "Niedostępny (np. wersja web)",
  };
}
