/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#18221D', background: '#F7F8F5', backgroundElement: '#FFFFFF', backgroundSelected: '#E6F0E5', textSecondary: '#5B6B61',
    surface: '#FFFFFF', surfaceElevated: '#FFFFFF', border: '#DCE3DE', primary: '#1F704C', accentGold: '#F0C96A', textPrimary: '#18221D', error: '#BA3636', success: '#287A50',
    primaryText: '#1F704C', primarySurface: '#E6F0E5', onPrimary: '#FFFFFF', onGold: '#27301A', brandSurface: '#216A49', brandMuted: '#D8E9D8',
    warning: '#765B1B', warningSurface: '#FFF0D8', warningBorder: '#E8C77B', errorSurface: '#FCEBEC', dangerSolid: '#7F3131', successSurface: '#E5F5E9', disabledSurface: '#DDE5DF', scrim: 'rgba(24,34,29,0.45)',
  },
  dark: {
    text: '#F0F4F1', background: '#111613', backgroundElement: '#1A221D', backgroundSelected: '#232D27', textSecondary: '#9EB0A4',
    surface: '#1A221D', surfaceElevated: '#232D27', border: '#2D3A31', primary: '#1F704C', accentGold: '#F0C96A', textPrimary: '#F0F4F1', error: '#FF7077', success: '#54C783',
    primaryText: '#82D6A6', primarySurface: '#232D27', onPrimary: '#FFFFFF', onGold: '#27301A', brandSurface: '#216A49', brandMuted: '#D8E9D8',
    warning: '#F0C96A', warningSurface: '#332B1A', warningBorder: '#806D3F', errorSurface: '#3E2327', dangerSolid: '#7F3131', successSurface: '#183C2A', disabledSurface: '#2D3A31', scrim: 'rgba(0,0,0,0.65)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
