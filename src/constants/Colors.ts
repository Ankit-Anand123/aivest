// src/constants/Colors.ts

export const Colors = {
  // Primary brand colors
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  
  // Secondary colors
  secondary: '#f3f4f6',
  secondaryDark: '#e5e7eb',
  secondaryLight: '#f9fafb',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  
  // Text colors
  textPrimary: '#1f2937',
  textSecondary: '#374151',
  textTertiary: '#6b7280',
  textDisabled: '#9ca3af',
  textLight: '#ffffff',
  
  // Background colors
  background: '#f9fafb',
  backgroundLight: '#ffffff',
  backgroundDark: '#f3f4f6',
  
  // Border colors
  border: '#d1d5db',
  borderLight: '#e5e7eb',
  borderDark: '#9ca3af',
  
  // Progress colors
  progressGood: '#10b981',
  progressWarning: '#f59e0b',
  progressDanger: '#ef4444',
  progressBackground: '#e5e7eb',
  
  // Scam risk colors
  riskLow: '#10b981',
  riskMedium: '#f59e0b',
  riskHigh: '#ef4444',
} as const;

export type ColorKey = keyof typeof Colors;

// Theme interface for future dark mode support
export interface Theme {
  colors: typeof Colors;
}

export const LightTheme: Theme = {
  colors: Colors,
};

// Color utility functions
export const getStatusColor = (status: 'good' | 'warning' | 'danger'): string => {
  switch (status) {
    case 'good':
      return Colors.success;
    case 'warning':
      return Colors.warning;
    case 'danger':
      return Colors.danger;
    default:
      return Colors.textSecondary;
  }
};

export const getRiskColor = (risk: 'Low' | 'Medium' | 'High'): string => {
  switch (risk) {
    case 'Low':
      return Colors.riskLow;
    case 'Medium':
      return Colors.riskMedium;
    case 'High':
      return Colors.riskHigh;
    default:
      return Colors.textSecondary;
  }
};