export const COLORS = {
  // Apple Dark Minimalist Palette (Steve Jobs Inspired)
  background: '#0b0f19', // Deep dark titanium
  surface: '#111827', // Card surface
  surfaceElevated: '#1f2937', // Elevated card / modal
  surfaceHover: '#2d3748',
  
  primary: '#2563eb', // Apple Blue
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  
  secondary: '#38bdf8', // Cyan/Sky
  secondaryLight: '#7dd3fc',
  secondaryDark: '#0284c7',
  
  accent: '#6366f1', // Indigo
  
  text: '#ffffff', // Pure white high contrast
  textSecondary: '#9ca3af', // Gray 400
  textLight: '#9ca3af', // Alias for backward compatibility
  textMuted: '#6b7280', // Gray 500
  
  border: '#374151', // Gray 700 crisp border
  borderLight: '#4b5563',
  
  white: '#ffffff',
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
  error: '#ef4444', // Red 500
};

export const GRADIENTS = {
  primary: ['#2563eb', '#38bdf8'] as const,
  secondary: ['#1f2937', '#111827'] as const,
  success: ['#059669', '#10b981'] as const,
  card: ['#111827', '#0f172a'] as const,
};
