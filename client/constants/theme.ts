import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#2D1B12",
    textSecondary: "#6B4E3D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B4E3D",
    tabIconSelected: "#D97757",
    link: "#D97757",
    primary: "#D97757",
    primaryDark: "#B85A3A",
    accent: "#7B94C4",
    success: "#5A8F6B",
    warning: "#E8A84F",
    error: "#C44A3A",
    backgroundRoot: "#FFF9F5",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F5EDE7",
    backgroundTertiary: "#EDE5DF",
    border: "#E5DDD7",
    cardShadow: "rgba(45, 27, 18, 0.08)",
  },
  dark: {
    text: "#F5EDE7",
    textSecondary: "#B8A99D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8B7A6D",
    tabIconSelected: "#E8A87C",
    link: "#E8A87C",
    primary: "#E8A87C",
    primaryDark: "#D97757",
    accent: "#8BA3D4",
    success: "#6A9F7B",
    warning: "#F0B85F",
    error: "#D45A4A",
    backgroundRoot: "#1A1210",
    backgroundDefault: "#252019",
    backgroundSecondary: "#302822",
    backgroundTertiary: "#3B322B",
    border: "#4A3F38",
    cardShadow: "rgba(0, 0, 0, 0.3)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  inputHeight: 56,
  buttonHeight: 64,
  iconSmall: 24,
  iconMedium: 32,
  iconLarge: 48,
  iconXLarge: 80,
  avatarSmall: 48,
  avatarMedium: 80,
  avatarLarge: 120,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  mega: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "400" as const,
  },
};

export const Shadows = {
  small: {
    shadowColor: "#2D1B12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: "#2D1B12",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: "#2D1B12",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  floating: {
    shadowColor: "#2D1B12",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 3,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
