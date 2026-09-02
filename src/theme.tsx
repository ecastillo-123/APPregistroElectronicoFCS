import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import { storage } from './config';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  ink: string;
  inkSoft: string;
  paper: string;
  card: string;
  cardAlt: string;
  line: string;
  navy: string;
  blue: string;
  blueDeep: string;
  blueSoft: string;
  banner: string;
  bannerBorder: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  muted: string;
  white: string;
}

export const palettes: Record<ThemeMode, ThemeColors> = {
  light: {
    ink: '#17203A',
    inkSoft: '#444D66',
    paper: '#F6F9FF',
    card: '#FFFFFF',
    cardAlt: '#F2F7FF',
    line: '#DEE9FB',
    navy: '#0C1B47',
    blue: '#1D4ED8',
    blueDeep: '#1E3A8A',
    blueSoft: '#DBEAFE',
    banner: '#FFFFFF',
    bannerBorder: '#E6EEFB',
    success: '#15803D',
    successSoft: '#DCFCE7',
    danger: '#B91C1C',
    dangerSoft: '#FEE2E2',
    muted: '#67708A',
    white: '#FFFFFF',
  },
  dark: {
    ink: '#EAF0FB',
    inkSoft: '#AEB9CF',
    paper: '#0B1220',
    card: '#111A2E',
    cardAlt: '#16233C',
    line: '#24334F',
    navy: '#050D21',
    blue: '#3B82F6',
    blueDeep: '#93C5FD',
    blueSoft: '#16295C',
    banner: '#0E1830',
    bannerBorder: '#24334F',
    success: '#4ADE80',
    successSoft: '#12291C',
    danger: '#F87171',
    dangerSoft: '#331B22',
    muted: '#8A93A8',
    white: '#FFFFFF',
  },
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  shadow: {
    elevation: number;
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
}

function makeShadow(colors: ThemeColors, isDark: boolean): Theme['shadow'] {
  if (Platform.OS === 'ios') {
    return {
      elevation: 0,
      shadowColor: isDark ? '#000000' : colors.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 12,
    };
  }
  return {
    elevation: isDark ? 4 : 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  };
}

function makeTheme(mode: ThemeMode): Theme {
  const colors = palettes[mode];
  return {
    mode,
    isDark: mode === 'dark',
    colors,
    shadow: makeShadow(colors, mode === 'dark'),
  };
}

interface ThemeContextValue {
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [saved, setSaved] = useState<ThemeMode | null>(null);

  useEffect(() => {
    storage.getTheme().then((m) => setSaved(m));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setSaved(mode);
    storage.setTheme(mode);
  }, []);

  const effective: ThemeMode = saved ?? (system === 'dark' ? 'dark' : 'light');

  const toggle = useCallback(() => {
    setMode(effective === 'light' ? 'dark' : 'light');
  }, [effective, setMode]);

  const theme = useMemo(() => makeTheme(effective), [effective]);

  const value = useMemo(
    () => ({ theme, setMode, toggle }),
    [theme, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return ctx;
}

export function useThemedStyles<T>(
  factory: (colors: ThemeColors, theme: Theme) => T,
): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme.colors, theme), [theme]);
}