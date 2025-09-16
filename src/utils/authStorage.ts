import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { 
  User, 
  UserPreferences, 
  AuthStorageKeys, 
  SessionData, 
  SecuritySettings,
  BiometricData 
} from '../types/auth';

// Generic secure storage functions
const storeSecureData = async <T>(key: AuthStorageKeys, value: T): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error('Error storing secure data:', error);
    return false;
  }
};

const getSecureData = async <T>(key: AuthStorageKeys, defaultValue: T): Promise<T> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (error) {
    console.error('Error getting secure data:', error);
    return defaultValue;
  }
};

const removeSecureData = async (key: AuthStorageKeys): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing secure data:', error);
    return false;
  }
};

// User data management
export const userStorage = {
  // Save user data
  saveUser: async (user: User): Promise<boolean> => {
    return await storeSecureData(AuthStorageKeys.USER_DATA, user);
  },

  // Get user data
  getUser: async (): Promise<User | null> => {
    return await getSecureData<User | null>(AuthStorageKeys.USER_DATA, null);
  },

  // Update user preferences
  updatePreferences: async (preferences: Partial<UserPreferences>): Promise<boolean> => {
    const user = await userStorage.getUser();
    if (!user) return false;

    const updatedUser: User = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences,
      },
    };

    return await userStorage.saveUser(updatedUser);
  },

  // Update user profile
  updateProfile: async (updates: Partial<Omit<User, 'id' | 'createdAt' | 'preferences'>>): Promise<boolean> => {
    const user = await userStorage.getUser();
    if (!user) return false;

    const updatedUser: User = {
      ...user,
      ...updates,
      lastLoginAt: new Date().toISOString(),
    };

    return await userStorage.saveUser(updatedUser);
  },

  // Clear user data (logout)
  clearUser: async (): Promise<boolean> => {
    return await removeSecureData(AuthStorageKeys.USER_DATA);
  },
};

// Authentication token management
export const tokenStorage = {
  // Save auth token
  saveToken: async (token: string): Promise<boolean> => {
    return await storeSecureData(AuthStorageKeys.AUTH_TOKEN, token);
  },

  // Get auth token
  getToken: async (): Promise<string | null> => {
    return await getSecureData<string | null>(AuthStorageKeys.AUTH_TOKEN, null);
  },

  // Remove auth token
  removeToken: async (): Promise<boolean> => {
    return await removeSecureData(AuthStorageKeys.AUTH_TOKEN);
  },
};

// Session management
export const sessionStorage = {
  // Save session data
  saveSession: async (session: SessionData): Promise<boolean> => {
    return await storeSecureData(AuthStorageKeys.LAST_LOGIN, session);
  },

  // Get current session
  getSession: async (): Promise<SessionData | null> => {
    return await getSecureData<SessionData | null>(AuthStorageKeys.LAST_LOGIN, null);
  },

  // Check if session is valid
  isSessionValid: async (): Promise<boolean> => {
    const session = await sessionStorage.getSession();
    if (!session) return false;

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    return now < expiresAt && session.isActive;
  },

  // Clear session
  clearSession: async (): Promise<boolean> => {
    return await removeSecureData(AuthStorageKeys.LAST_LOGIN);
  },
};

// Biometric authentication
export const biometricStorage = {
  // Check if biometric is available
  isBiometricAvailable: async (): Promise<BiometricData> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (!hasHardware || !isEnrolled) {
        return { enabled: false, type: 'none' };
      }

      const type = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) 
        ? 'faceId' 
        : 'fingerprint';

      const enabled = await getSecureData<boolean>(AuthStorageKeys.BIOMETRIC_ENABLED, false);

      return { enabled, type };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { enabled: false, type: 'none' };
    }
  },

  // Authenticate with biometrics
  authenticateWithBiometrics: async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Aivest',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Error authenticating with biometrics:', error);
      return false;
    }
  },

  // Enable/disable biometric authentication
  setBiometricEnabled: async (enabled: boolean): Promise<boolean> => {
    return await storeSecureData(AuthStorageKeys.BIOMETRIC_ENABLED, enabled);
  },

  // Get biometric enabled status
  getBiometricEnabled: async (): Promise<boolean> => {
    return await getSecureData<boolean>(AuthStorageKeys.BIOMETRIC_ENABLED, false);
  },
};

// PIN management
export const pinStorage = {
  // Save PIN hash
  savePinHash: async (pinHash: string): Promise<boolean> => {
    return await storeSecureData(AuthStorageKeys.PIN_HASH, pinHash);
  },

  // Get PIN hash
  getPinHash: async (): Promise<string | null> => {
    return await getSecureData<string | null>(AuthStorageKeys.PIN_HASH, null);
  },

  // Remove PIN
  removePin: async (): Promise<boolean> => {
    return await removeSecureData(AuthStorageKeys.PIN_HASH);
  },

  // Verify PIN
  verifyPin: async (pin: string): Promise<boolean> => {
    const storedHash = await pinStorage.getPinHash();
    if (!storedHash) return false;

    // Simple hash comparison (in production, use proper hashing)
    const pinHash = await hashPin(pin);
    return pinHash === storedHash;
  },
};

// Remember me functionality
export const rememberMeStorage = {
  // Set remember me
  setRememberMe: async (email: string): Promise<boolean> => {
    return await storeSecureData(AuthStorageKeys.REMEMBER_ME, email);
  },

  // Get remembered email
  getRememberedEmail: async (): Promise<string | null> => {
    return await getSecureData<string | null>(AuthStorageKeys.REMEMBER_ME, null);
  },

  // Clear remember me
  clearRememberMe: async (): Promise<boolean> => {
    return await removeSecureData(AuthStorageKeys.REMEMBER_ME);
  },
};

// Utility functions
export const createDefaultPreferences = (): UserPreferences => ({
  currency: 'INR',
  language: 'en',
  notifications: {
    budgetAlerts: true,
    scamAlerts: true,
    savingsReminders: true,
    weeklyReports: false,
  },
  security: {
    biometricEnabled: false,
    pinEnabled: false,
    sessionTimeout: 30, // 30 minutes
  },
  theme: 'auto',
});

// Simple PIN hashing (replace with proper hashing in production)
const hashPin = async (pin: string): Promise<string> => {
  // This is a simple implementation - use crypto libraries in production
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

// Clear all auth data (complete logout)
export const clearAllAuthData = async (): Promise<boolean> => {
  try {
    await Promise.all([
      userStorage.clearUser(),
      tokenStorage.removeToken(),
      sessionStorage.clearSession(),
      rememberMeStorage.clearRememberMe(),
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing all auth data:', error);
    return false;
  }
};