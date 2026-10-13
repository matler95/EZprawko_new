/** Shared mobile controls: minimum height, never a fixed text/container height. */
export const UiTokens = {
  space: { small: 8, medium: 16, large: 24 },
  radius: { control: 16, card: 20 },
  target: { minimum: 48, primary: 56 },
  text: {
    body: { fontSize: 16, lineHeight: 24 },
    label: { fontSize: 16, lineHeight: 24, fontWeight: '700' as const },
    heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  },
} as const;
