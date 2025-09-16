export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePicture?: string;
  createdAt: string;
  lastLoginAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  language: 'en' | 'hi' | 'ta' | 'te';
  notifications: {
    budgetAlerts: boolean;
    scamAlerts: boolean;
    savingsReminders: boolean;
    weeklyReports: boolean;
  };
  security: {
    biometricEnabled: boolean;
    pinEnabled: boolean;
    sessionTimeout: number; // in minutes
  };
  theme: 'light' | 'dark' | 'auto';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  isFirstTime: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  agreeToTerms: boolean;
}

export interface ResetPasswordData {
  email: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface BiometricData {
  enabled: boolean;
  type: 'fingerprint' | 'faceId' | 'none';
}

// Auth Storage Keys
export enum AuthStorageKeys {
  USER_DATA = 'aivest_user_data',
  AUTH_TOKEN = 'aivest_auth_token',
  BIOMETRIC_ENABLED = 'aivest_biometric_enabled',
  PIN_HASH = 'aivest_pin_hash',
  REMEMBER_ME = 'aivest_remember_me',
  LAST_LOGIN = 'aivest_last_login',
}

// Security
export interface SecuritySettings {
  autoLockEnabled: boolean;
  autoLockTimeout: number; // minutes
  biometricEnabled: boolean;
  pinEnabled: boolean;
  requireAuth: boolean;
}

// Session management
export interface SessionData {
  userId: string;
  loginTime: string;
  expiresAt: string;
  deviceId: string;
  isActive: boolean;
}