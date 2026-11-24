/**
 * Material 3 design tokens, seeded from the website's customer palette
 * (customer-theme.css / atz.css) so the app looks the same as the mobile site.
 * Colour roles follow MD3 naming: always pair `x` with `onX`.
 */
export const color = {
  primary: '#126b3e',
  onPrimary: '#ffffff',
  primaryContainer: '#e2efd6',
  onPrimaryContainer: '#105c35',
  primaryOutline: '#9bbb8b',

  secondary: '#3f6042',
  onSecondary: '#ffffff',
  secondaryContainer: '#dcebcf',
  onSecondaryContainer: '#1f3a24',

  tertiary: '#dc2626',
  onTertiary: '#ffffff',

  error: '#dc2626',
  onError: '#ffffff',
  errorContainer: '#fde8e8',
  onErrorContainer: '#8a1c1c',

  surface: '#fffefa',
  onSurface: '#172b21',
  onSurfaceVariant: '#596a5d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fbfbf8',
  surfaceContainer: '#f4f5ee',
  surfaceContainerHigh: '#e9f0e5',
  surfaceContainerHighest: '#e3ebe0',

  outline: '#9aa791',
  outlineVariant: '#d7e0d1',
  divider: '#edf0e7',

  inverseSurface: '#163e2b',
  inverseOnSurface: '#d8e9bf',

  // Header gradient (website: linear-gradient(90deg, #116b3d, #20834b))
  headerStart: '#116b3d',
  headerEnd: '#20834b',
  onHeader: '#ffffff',
  onHeaderMuted: '#e1f0dd',
  headerAccent: '#d1f29c',

  heart: '#bc6b66',
  heartFill: '#f3d9d6',
  badge: '#e5484d',
  scrim: 'rgba(0,0,0,0.45)',

  // Category tile tints (atz.css nth-child backgrounds)
  tileTints: ['#f5ecd6', '#e9f0e5', '#f7e9de', '#e9eff6'],
} as const;

export const font = {
  display: 'Manrope_800ExtraBold',
  displayBold: 'Manrope_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

/** MD3 type scale, sized to match the website's mobile view. */
export const type = {
  displaySmall: { fontFamily: font.display, fontSize: 32, lineHeight: 37, letterSpacing: -1.2 },
  headlineSmall: { fontFamily: font.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.8 },
  titleLarge: { fontFamily: font.display, fontSize: 19, lineHeight: 25, letterSpacing: -0.65 },
  titleMedium: { fontFamily: font.display, fontSize: 16, lineHeight: 22, letterSpacing: -0.4 },
  titleSmall: { fontFamily: font.bodyBold, fontSize: 14, lineHeight: 20 },
  bodyLarge: { fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: font.body, fontSize: 12, lineHeight: 16 },
  labelLarge: { fontFamily: font.bodyBold, fontSize: 14, lineHeight: 20 },
  labelMedium: { fontFamily: font.bodyBold, fontSize: 12, lineHeight: 16 },
  labelSmall: { fontFamily: font.bodyMedium, fontSize: 10, lineHeight: 14 },
} as const;

/** MD3 shape scale. */
export const shape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  largeIncreased: 20,
  extraLarge: 28,
  full: 9999,
} as const;

/** 8dp-based spacing. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

/** Minimum touch target (MD3 / WCAG). */
export const TOUCH = 48;
