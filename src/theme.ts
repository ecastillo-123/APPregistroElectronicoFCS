import { Platform } from 'react-native';

export const colors = {
  ink: '#1C1917',
  inkSoft: '#44403C',
  paper: '#FAF9F7',
  card: '#FFFFFF',
  line: '#E7E5E4',
  amber: '#D97706',
  amberDeep: '#92400E',
  amberSoft: '#FEF3C7',
  success: '#15803D',
  successSoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  muted: '#78716C',
  white: '#FFFFFF',
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const shadow = Platform.select({
  android: {
    elevation: 3,
  },
  ios: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  default: {},
});
