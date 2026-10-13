import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/context/app-theme-context';
import { UiTokens } from '@/constants/ui-tokens';

export function AppButton({ label, onPress, variant = 'primary', disabled = false, busy = false, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'gold' | 'link' | 'danger';
  disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const blocked = disabled || busy;
  const textOnly = variant === 'link' || variant === 'danger';
  const foreground = blocked ? textOnly ? colors.textSecondary : colors.textPrimary : variant === 'primary' ? colors.onPrimary : variant === 'gold' ? colors.onGold : variant === 'danger' ? colors.error : colors.primaryText;
  const background = blocked && !textOnly ? colors.disabledSurface : variant === 'primary' ? colors.primary : variant === 'gold' ? colors.accentGold : variant === 'secondary' ? colors.primarySurface : 'transparent';
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: blocked, busy }} disabled={blocked} onPress={onPress}
    style={({ pressed }) => [{
      minHeight: textOnly ? UiTokens.target.minimum : UiTokens.target.primary,
      paddingHorizontal: UiTokens.space.medium, paddingVertical: textOnly ? UiTokens.space.small : UiTokens.space.medium,
      borderRadius: UiTokens.radius.control, backgroundColor: background,
      alignItems: 'center', justifyContent: 'center', opacity: pressed && !blocked ? 0.85 : 1,
    }, style]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: UiTokens.space.small, maxWidth: '100%' }}>
      {busy && <ActivityIndicator color={foreground} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />}
      <Text style={{ ...UiTokens.text.label, color: foreground, textAlign: 'center', flexShrink: 1 }}>{label}</Text>
    </View>
  </Pressable>;
}

export function AppCard({ children, tone = 'neutral', outlined = false, style }: {
  children: ReactNode; tone?: 'neutral' | 'warning'; outlined?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  return <View style={[{
    backgroundColor: tone === 'warning' ? colors.warningSurface : colors.surface,
    padding: UiTokens.space.large, borderRadius: UiTokens.radius.card, gap: UiTokens.space.small,
    ...(outlined ? { borderWidth: 1, borderColor: tone === 'warning' ? colors.warningBorder : colors.border } : {}),
  }, style]}>{children}</View>;
}

export function AppStatus({ message, tone = 'info' }: {
  message: string; tone?: 'info' | 'error' | 'success' | 'warning';
}) {
  const { colors } = useAppTheme();
  const color = tone === 'error' ? colors.error : tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.textSecondary;
  return <Text accessibilityRole={tone === 'error' ? 'alert' : 'text'} accessibilityLiveRegion="polite"
    style={{ ...UiTokens.text.body, color }}>{message}</Text>;
}
