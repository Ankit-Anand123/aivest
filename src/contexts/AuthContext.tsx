import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  User, 
  AuthState, 
  LoginCredentials, 
  SignupCredentials,
  ChangePasswordData,
} from '../types/auth';
import { 
  userStorage, 
  tokenStorage, 
  sessionStorage, 
  biometricStorage,
  pinStorage,
  rememberMeStorage,
  createDefaultPreferences,
  clearAllAuthData,
} from '../utils/authStorage';

// Auth Actions
type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_FIRST_TIME'; payload: boolean };

// Auth Context Type
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  signup: (credentials: SignupCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  biometricLogin: () => Promise<boolean>;
  pinLogin: (pin: string) => Promise<boolean>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  changePassword: (data: ChangePasswordData) => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<boolean>;
  setupPin: (pin: string) => Promise<boolean>;
  removePin: () => Promise<boolean>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

// Initial State
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  isFirstTime: true,
};

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        isAuthenticated: true, 
        user: action.payload, 
        loading: false, 
        error: null,
        isFirstTime: false,
      };
    
    case 'LOGOUT':
      return { 
        ...initialState, 
        loading: false,
        isFirstTime: state.isFirstTime,
      };
    
    case 'UPDATE_USER':
      return { 
        ...state, 
        user: state.user ? { ...state.user, ...action.payload } : null 
      };
    
    case 'SET_FIRST_TIME':
      return { ...state, isFirstTime: action.payload };
    
    default:
      return state;
  }
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const user = await userStorage.getUser();
      const isSessionValid = await sessionStorage.isSessionValid();

      if (user && isSessionValid) {
        // Update last login time
        await userStorage.updateProfile({ lastLoginAt: new Date().toISOString() });
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } else {
        // Clear invalid session data
        await clearAllAuthData();
        dispatch({ type: 'LOGOUT' });
      }

      // Check if this is first time user
      const rememberedEmail = await rememberMeStorage.getRememberedEmail();
      dispatch({ type: 'SET_FIRST_TIME', payload: !user && !rememberedEmail });

    } catch (error) {
      console.error('Error checking auth status:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to check authentication status' });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Mock API call - replace with actual authentication
      const mockUser = await mockLoginAPI(credentials);
      
      if (mockUser) {
        // Save user data
        await userStorage.saveUser(mockUser);
        
        // Save auth token (mock)
        await tokenStorage.saveToken('mock_token_' + mockUser.id);
        
        // Create session
        const sessionData = {
          userId: mockUser.id,
          loginTime: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          deviceId: 'mock_device_id',
          isActive: true,
        };
        await sessionStorage.saveSession(sessionData);

        // Handle remember me
        if (credentials.rememberMe) {
          await rememberMeStorage.setRememberMe(credentials.email);
        }

        dispatch({ type: 'LOGIN_SUCCESS', payload: mockUser });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Invalid email or password' });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Login failed. Please try again.' });
      return false;
    }
  };

  const signup = async (credentials: SignupCredentials): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Validation
      if (credentials.password !== credentials.confirmPassword) {
        dispatch({ type: 'SET_ERROR', payload: 'Passwords do not match' });
        return false;
      }

      if (!credentials.agreeToTerms) {
        dispatch({ type: 'SET_ERROR', payload: 'Please agree to terms and conditions' });
        return false;
      }

      // Mock API call - replace with actual registration
      const newUser: User = {
        id: Date.now().toString(),
        email: credentials.email,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        phone: credentials.phone,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        preferences: createDefaultPreferences(),
      };

      // Save user data
      await userStorage.saveUser(newUser);
      
      // Save auth token
      await tokenStorage.saveToken('mock_token_' + newUser.id);

      // Create session
      const sessionData = {
        userId: newUser.id,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        deviceId: 'mock_device_id',
        isActive: true,
      };
      await sessionStorage.saveSession(sessionData);

      dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Registration failed. Please try again.' });
      return false;
    }
  };

  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await clearAllAuthData();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const biometricLogin = async (): Promise<boolean> => {
    try {
      const biometricData = await biometricStorage.isBiometricAvailable();
      
      if (!biometricData.enabled) {
        dispatch({ type: 'SET_ERROR', payload: 'Biometric authentication is not enabled' });
        return false;
      }

      const isAuthenticated = await biometricStorage.authenticateWithBiometrics();
      
      if (isAuthenticated) {
        await checkAuthStatus();
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Biometric authentication failed' });
        return false;
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Biometric authentication error' });
      return false;
    }
  };

  const pinLogin = async (pin: string): Promise<boolean> => {
    try {
      const isPinValid = await pinStorage.verifyPin(pin);
      
      if (isPinValid) {
        await checkAuthStatus();
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Invalid PIN' });
        return false;
      }
    } catch (error) {
      console.error('PIN login error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'PIN authentication error' });
      return false;
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      const success = await userStorage.updateProfile(updates);
      if (success && state.user) {
        dispatch({ type: 'UPDATE_USER', payload: updates });
      }
      return success;
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  };

  const changePassword = async (data: ChangePasswordData): Promise<boolean> => {
    try {
      if (data.newPassword !== data.confirmNewPassword) {
        dispatch({ type: 'SET_ERROR', payload: 'New passwords do not match' });
        return false;
      }

      // Mock password change - implement actual logic
      dispatch({ type: 'SET_ERROR', payload: null });
      return true;
    } catch (error) {
      console.error('Password change error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to change password' });
      return false;
    }
  };

  const enableBiometric = async (): Promise<boolean> => {
    try {
      const isAuthenticated = await biometricStorage.authenticateWithBiometrics();
      if (isAuthenticated) {
        await biometricStorage.setBiometricEnabled(true);
        await userStorage.updatePreferences({ 
          security: { 
            ...state.user?.preferences.security, 
            biometricEnabled: true 
          } 
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Enable biometric error:', error);
      return false;
    }
  };

  const disableBiometric = async (): Promise<boolean> => {
    try {
      await biometricStorage.setBiometricEnabled(false);
      await userStorage.updatePreferences({ 
        security: { 
          ...state.user?.preferences.security, 
          biometricEnabled: false 
        } 
      });
      return true;
    } catch (error) {
      console.error('Disable biometric error:', error);
      return false;
    }
  };

  const setupPin = async (pin: string): Promise<boolean> => {
    try {
      // Simple pin hash - use proper hashing in production
      let hash = 0;
      for (let i = 0; i < pin.length; i++) {
        const char = pin.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      await pinStorage.savePinHash(hash.toString());
      await userStorage.updatePreferences({ 
        security: { 
          ...state.user?.preferences.security, 
          pinEnabled: true 
        } 
      });
      return true;
    } catch (error) {
      console.error('Setup PIN error:', error);
      return false;
    }
  };

  const removePin = async (): Promise<boolean> => {
    try {
      await pinStorage.removePin();
      await userStorage.updatePreferences({ 
        security: { 
          ...state.user?.preferences.security, 
          pinEnabled: false 
        } 
      });
      return true;
    } catch (error) {
      console.error('Remove PIN error:', error);
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    biometricLogin,
    pinLogin,
    updateProfile,
    changePassword,
    enableBiometric,
    disableBiometric,
    setupPin,
    removePin,
    checkAuthStatus,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use Auth Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock API functions (replace with actual API calls)
const mockLoginAPI = async (credentials: LoginCredentials): Promise<User | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock user for testing
  if (credentials.email === 'test@aivest.com' && credentials.password === 'password') {
    return {
      id: '1',
      email: credentials.email,
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: createDefaultPreferences(),
    };
  }

  return null;
};