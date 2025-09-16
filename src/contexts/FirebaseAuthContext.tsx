import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseService';
import { 
  User, 
  AuthState, 
  LoginCredentials, 
  SignupCredentials,
  UserPreferences
} from '../types/auth';
import { 
  userStorage, 
  sessionStorage,
  clearAllAuthData 
} from '../utils/authStorage';

// Create default preferences function (if not in authStorage)
const createDefaultPreferences = (): UserPreferences => ({
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
    sessionTimeout: 30,
  },
  theme: 'auto',
});

// Firebase Auth Actions
type FirebaseAuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { firebaseUser: FirebaseUser; userData: User } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_FIRST_TIME'; payload: boolean };

// Enhanced Auth Context Type
interface FirebaseAuthContextType extends AuthState {
  // Authentication
  login: (credentials: LoginCredentials) => Promise<boolean>;
  signup: (credentials: SignupCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Profile Management
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<boolean>;
  
  // Firebase User
  firebaseUser: FirebaseUser | null;
  
  // Cross-device sync
  syncToCloud: () => Promise<boolean>;
  restoreFromCloud: () => Promise<boolean>;
  
  // Utility
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
}

// Enhanced Initial State
const initialState: AuthState & { firebaseUser: FirebaseUser | null } = {
  isAuthenticated: false,
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  isFirstTime: true,
};

// Enhanced Auth Reducer
const firebaseAuthReducer = (state: typeof initialState, action: FirebaseAuthAction): typeof initialState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        isAuthenticated: true, 
        user: action.payload.userData,
        firebaseUser: action.payload.firebaseUser,
        loading: false, 
        error: null,
        isFirstTime: false,
      };
    
    case 'LOGOUT':
      return { 
        ...initialState, 
        loading: false,
        firebaseUser: null,
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
const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

// Auth Provider Component
interface FirebaseAuthProviderProps {
  children: ReactNode;
}

export const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(firebaseAuthReducer, initialState);

  // Listen to Firebase auth state changes
  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('🔥 Firebase user detected:', firebaseUser.email);
        await handleFirebaseUserLogin(firebaseUser);
      } else {
        console.log('🔥 Firebase user signed out');
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => {
      console.log('🔥 Cleaning up Firebase auth listener');
      unsubscribe();
    };
  }, []);

  // Handle Firebase user login (create or restore user data)
  const handleFirebaseUserLogin = async (firebaseUser: FirebaseUser) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Try to get existing user data from Firestore
      const userDoc = await getDoc(doc(db, 'user_profiles', firebaseUser.uid));
      
      let userData: User;
      
      if (userDoc.exists()) {
        // Existing user - restore from cloud
        console.log('👤 Existing user found, restoring data...');
        userData = userDoc.data() as User;
      } else {
        // New user - create profile
        console.log('🆕 New user detected, creating profile...');
        userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ')[1] || '',
          profilePicture: firebaseUser.photoURL || null,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          preferences: createDefaultPreferences(),
        };

        // Save new user profile to Firestore
        await setDoc(doc(db, 'user_profiles', firebaseUser.uid), userData);
        console.log('✅ New user profile created in Firestore');
      }

      // Save to local storage
      await userStorage.saveUser(userData);

      // Create session
      const sessionData = {
        userId: firebaseUser.uid,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        deviceId: 'device_' + Math.random().toString(36).substring(2, 15),
        isActive: true,
      };
      await sessionStorage.saveSession(sessionData);

      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { 
          firebaseUser, 
          userData 
        } 
      });

      console.log('✅ User authentication completed successfully');

    } catch (error: any) {
      console.error('❌ Error handling Firebase user:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Enhanced signup with Firebase
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

      console.log('🔐 Creating Firebase account...');

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );

      const firebaseUser = userCredential.user;

      // Update Firebase profile with name
      await updateProfile(firebaseUser, {
        displayName: `${credentials.firstName} ${credentials.lastName}`
      });

      console.log('✅ Firebase account created successfully');

      // The onAuthStateChanged listener will handle the rest
      return true;

    } catch (error: any) {
      console.error('❌ Signup error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
    }
  };

  // Enhanced login with Firebase
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log('🔐 Signing in with Firebase...');

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      console.log('✅ Firebase sign-in successful');

      // The onAuthStateChanged listener will handle the rest
      return true;

    } catch (error: any) {
      console.error('❌ Login error:', error);

      // Handle specific Firebase errors
      let errorMessage = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
    }
  };

  // Enhanced logout
  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      console.log('🔐 Signing out...');
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear local storage
      await clearAllAuthData();
      
      console.log('✅ Signed out successfully');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  // Update user profile (both local and cloud)
  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      if (!state.user || !state.firebaseUser) return false;

      const updatedUser = { ...state.user, ...updates, lastLoginAt: new Date().toISOString() };

      // Update in Firestore
      await setDoc(doc(db, 'user_profiles', state.firebaseUser.uid), updatedUser, { merge: true });

      // Update locally
      await userStorage.saveUser(updatedUser);

      dispatch({ type: 'UPDATE_USER', payload: updates });
      
      console.log('✅ Profile updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Profile update error:', error);
      return false;
    }
  };

  // Update user preferences
  const updatePreferences = async (preferences: Partial<UserPreferences>): Promise<boolean> => {
    try {
      if (!state.user) return false;

      const updatedPreferences = { ...state.user.preferences, ...preferences };
      return await updateProfile({ preferences: updatedPreferences });

    } catch (error) {
      console.error('❌ Preferences update error:', error);
      return false;
    }
  };

  // Sync local data to cloud (for backup)
  const syncToCloud = async (): Promise<boolean> => {
    try {
      if (!state.firebaseUser) return false;

      console.log('☁️ Syncing data to cloud...');
      
      if (state.user) {
        await setDoc(doc(db, 'user_profiles', state.firebaseUser.uid), state.user, { merge: true });
      }

      console.log('✅ Data synced to cloud');
      return true;

    } catch (error) {
      console.error('❌ Cloud sync error:', error);
      return false;
    }
  };

  // Restore data from cloud
  const restoreFromCloud = async (): Promise<boolean> => {
    try {
      if (!state.firebaseUser) return false;

      console.log('☁️ Restoring data from cloud...');

      const userDoc = await getDoc(doc(db, 'user_profiles', state.firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        await userStorage.saveUser(userData);
        dispatch({ type: 'UPDATE_USER', payload: userData });
        
        console.log('✅ Data restored from cloud');
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Cloud restore error:', error);
      return false;
    }
  };

  const checkAuthStatus = async () => {
    // Firebase handles auth state automatically with onAuthStateChanged
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: FirebaseAuthContextType = {
    ...state,
    login,
    signup,
    logout,
    updateProfile,
    updatePreferences,
    syncToCloud,
    restoreFromCloud,
    checkAuthStatus,
    clearError,
  };

  return (
    <FirebaseAuthContext.Provider value={contextValue}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

// Custom hook to use Firebase Auth Context
export const useFirebaseAuth = (): FirebaseAuthContextType => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};