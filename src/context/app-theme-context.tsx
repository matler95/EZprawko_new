import { createContext, useContext } from "react";

import { Colors } from "@/constants/theme";
import type { ThemePreference } from "@/database/repository";

export type AppTheme = (typeof Colors)[keyof typeof Colors];

export const AppThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colors: AppTheme;
}>({ preference: "system", setPreference: () => undefined, colors: Colors.light });

export const useAppTheme = () => useContext(AppThemeContext);
