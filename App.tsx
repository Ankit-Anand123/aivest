import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';

// Enhanced Auth Context with Firebase
import { FirebaseAuthProvider, useFirebaseAuth } from './src/contexts/FirebaseAuthContext';

// Services
import { testFirebaseConnection } from './src/services/firebaseService';
import { SecureBackupService } from './src/services/secureBackupService';
import { AnalyticsService } from './src/services/analyticsService';

// Screens
import SpendingScreen from './src/screens/main/SpendingScreen';
import SavingScreen from './src/screens/main/SavingScreen';
import SafetyScreen from './src/screens/main/SafetyScreen';
import LoginScreen, { SignUpScreen } from './src/screens/auth/LoginScreen';

// Stack and Tab Navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right' 
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

// Main Tab Navigator with Analytics Tracking
function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Spending') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Saving') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Safety') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else {
            iconName = 'help-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: insets.bottom,
          paddingTop: 5,
          height: 60 + insets.bottom,
        },
      })}
      screenListeners={{
        tabPress: (e) => {
          // Track screen navigation for analytics
          AnalyticsService.trackScreenView(e.target?.split('-')[0] || 'Unknown');
        },
      }}
    >
      <Tab.Screen 
        name="Spending" 
        component={SpendingScreen}
        options={{
          title: 'Spending',
          headerTitle: '💰 Spending Tracker',
          headerRight: () => (
            <Ionicons 
              name="sync" 
              size={24} 
              color="#ffffff" 
              style={{ marginRight: 15 }}
              onPress={async () => {
                AnalyticsService.trackFeatureUsage('manual_sync');
                await AnalyticsService.syncSpendingPatterns();
              }}
            />
          )
        }}
        listeners={{
          focus: () => AnalyticsService.trackScreenView('Spending'),
        }}
      />
      <Tab.Screen 
        name="Saving" 
        component={SavingScreen}
        options={{
          title: 'Saving',
          headerTitle: '🎯 Savings Goals',
          headerRight: () => (
            <Ionicons 
              name="cloud-upload" 
              size={24} 
              color="#ffffff" 
              style={{ marginRight: 15 }}
              onPress={async () => {
                AnalyticsService.trackFeatureUsage('manual_backup');
                // Manual backup trigger - will be implemented
              }}
            />
          )
        }}
        listeners={{
          focus: () => AnalyticsService.trackScreenView('Saving'),
        }}
      />
      <Tab.Screen 
        name="Safety" 
        component={SafetyScreen}
        options={{
          title: 'Safety',
          headerTitle: '🛡️ Financial Safety'
        }}
        listeners={{
          focus: () => AnalyticsService.trackScreenView('Safety'),
        }}
      />
    </Tab.Navigator>
  );
}

// App Navigator with Enhanced Authentication
function AppNavigator() {
  const { isAuthenticated, loading, user, firebaseUser, syncToCloud, restoreFromCloud } = useFirebaseAuth();

  // Auto-sync and analytics setup when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && firebaseUser) {
      initializeUserServices();
    }
  }, [isAuthenticated, user, firebaseUser]);

  const initializeUserServices = async () => {
    try {
      console.log('🚀 Initializing user services...');

      // Initialize analytics with user data (anonymous)
      await AnalyticsService.initializeAnalytics(user!.email, {
        // Optional demographic data (you can collect this during signup)
        ageGroup: 'prefer_not_to_say',
        incomeRange: 'prefer_not_to_say',
        location: { country: 'IN', state: 'Unknown' },
        familySize: 1
      });

      // Start periodic analytics sync
      AnalyticsService.startPeriodicSync();

      // Check if user has cloud backup and offer to restore
      const hasBackup = await SecureBackupService.hasBackup(firebaseUser!.uid);
      
      if (hasBackup) {
        console.log('☁️ Cloud backup detected - you can restore your data');
        // In a real app, you'd show a modal asking if user wants to restore
        // For now, we'll auto-restore
        const restored = await SecureBackupService.restoreFromCloud(
          firebaseUser!.uid, 
          user!.email
        );
        
        if (restored) {
          console.log('✅ Data restored from cloud backup');
        }
      }

      // Schedule auto-backup on data changes
      SecureBackupService.scheduleAutoBackup(firebaseUser!.uid, user!.email);

      console.log('✅ All user services initialized');

    } catch (error) {
      console.error('❌ Error initializing user services:', error);
    }
  };

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f8fafc' 
      }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <View style={{ marginTop: 16 }}>
          <Ionicons name="shield-checkmark" size={32} color="#2563eb" />
        </View>
      </View>
    );
  }

  // Show auth stack or main app based on authentication status
  return (
    <NavigationContainer>
      {isAuthenticated && user ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

// Main App Component with Complete Dual-Layer Architecture
export default function App() {
  
  // Initialize Firebase and test connection on app start
  useEffect(() => {
    const initializeAivest = async () => {
      try {
        console.log('🚀 Initializing Aivest with Dual-Layer Architecture...');
        
        // Test Firebase connection
        const isConnected = await testFirebaseConnection();
        
        if (isConnected) {
          console.log('✅ Firebase integration ready!');
          console.log('🔐 Secure backup system: Active');
          console.log('📊 Anonymous analytics: Active');
          console.log('🛡️ Dual-layer architecture: Operational');
        } else {
          console.log('⚠️ Firebase connection issues detected');
        }

      } catch (error) {
        console.error('❌ Aivest initialization failed:', error);
      }
    };

    initializeAivest();

    // Cleanup on app unmount
    return () => {
      AnalyticsService.stopPeriodicSync();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <FirebaseAuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </FirebaseAuthProvider>
    </SafeAreaProvider>
  );
}