export const colors = {
  bg: '#f7f7f8',
  surface: '#ffffff',
  border: '#e7e7ea',
  borderStrong: '#d8d8dd',
  text: '#17171a',
  textMuted: '#68686f',
  textFaint: '#9a9aa1',
  primary: '#1b1b1b',
  primaryText: '#ffffff',
  accent: '#2563eb',
  danger: '#e11d48',
  success: '#3aa15c',
  overlay: 'rgba(0,0,0,0.04)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
};

/** Standard pressed-state opacity for Pressable style callbacks. */
export function pressedStyle(pressed: boolean) {
  return pressed ? { opacity: 0.7 } : undefined;
}
