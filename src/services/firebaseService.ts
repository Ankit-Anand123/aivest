import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth,
  connectAuthEmulator
} from 'firebase/auth';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyB_3-STlBfHKjxOyQMXARtp_XUYqs5ZfQY",
  authDomain: "aivest-9f926.firebaseapp.com",
  projectId: "aivest-9f926",
  storageBucket: "aivest-9f926.firebasestorage.app",
  messagingSenderId: "413360700776",
  appId: "1:413360700776:web:ca8c8572776bda98732add",
  measurementId: "G-HZH0EDLP8F"
};


// Initialize Firebase (only once)
let app: FirebaseApp;
let auth: any;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth (simplified - no custom persistence needed)
  auth = getAuth(app);
  console.log('✅ Firebase Auth initialized');
} else {
  app = getApps()[0];
  auth = getAuth(app);
}

// Get Firebase services
export const db = getFirestore(app);
export { auth };

// Test Firebase connection with proper auth
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔥 Testing Firebase Web SDK connection...');
    console.log('🔧 Project ID:', firebaseConfig.projectId);
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    console.log('🔐 Auth state:', currentUser ? `Logged in as: ${currentUser.email}` : 'Not logged in');
    
    if (!currentUser) {
      console.log('ℹ️ Testing without authentication...');
      
      // Test with a simple read that should work with basic rules
      try {
        const testRef = doc(collection(db, 'public_test'), 'connection');
        const testDoc = await getDoc(testRef);
        console.log('✅ Firestore connection working (read test)');
        
        return true;
      } catch (readError: any) {
        console.log('📝 Testing with write operation...');
        
        // Try creating a test user first
        return await testWithTemporaryAuth();
      }
    }
    
    // If user is authenticated, proceed with full test
    return await performAuthenticatedTest(currentUser.uid);
    
  } catch (error: any) {
    console.error('❌ Firebase connection failed:', error.message);
    console.error('🔍 Error code:', error.code);
    console.error('🔍 Full error:', error);
    
    return false;
  }
};

// Test with temporary anonymous authentication
const testWithTemporaryAuth = async (): Promise<boolean> => {
  try {
    const { signInAnonymously } = await import('firebase/auth');
    
    console.log('🎭 Signing in anonymously for test...');
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log('✅ Anonymous auth successful:', user.uid);
    
    // Now test Firestore operations
    const result = await performAuthenticatedTest(user.uid);
    
    // Clean up - sign out anonymous user
    await auth.signOut();
    console.log('🧹 Signed out anonymous user');
    
    return result;
    
  } catch (authError: any) {
    console.error('❌ Anonymous auth failed:', authError.message);
    return false;
  }
};

// Perform authenticated Firestore test
const performAuthenticatedTest = async (userId: string): Promise<boolean> => {
  try {
    console.log('📊 Testing authenticated Firestore operations...');
    
    // Test 1: Write to connection_test (should be allowed by rules)
    const testRef = doc(collection(db, 'connection_test'), 'test');
    
    await setDoc(testRef, {
      message: 'Aivest Firebase Web SDK connected successfully!',
      timestamp: serverTimestamp(),
      version: '1.0.0',
      platform: 'Expo + Firebase Web',
      userId: userId
    });
    
    console.log('✅ Firestore write successful');
    
    // Test 2: Read the data back
    const testDoc = await getDoc(testRef);
    if (testDoc.exists()) {
      console.log('✅ Firestore read successful:', testDoc.data()?.message);
    } else {
      console.log('⚠️ Firestore read: document not found');
    }
    
    // Test 3: Clean up test document
    await deleteDoc(testRef);
    console.log('🧹 Test cleanup completed');
    
    console.log('🎉 All Firebase tests passed!');
    return true;
    
  } catch (error: any) {
    console.error('❌ Authenticated test failed:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('🚫 Permission denied - check Firestore security rules');
      console.error('💡 Tip: Make sure your rules allow authenticated users to write to connection_test');
    }
    
    return false;
  }
};

// Test specific Aivest collections
export const testAivestCollections = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Aivest-specific collections...');
    
    if (!auth.currentUser) {
      console.log('⚠️ Need authentication for Aivest collections test');
      return false;
    }
    
    // Test anonymous analytics write (should work with rules)
    const testAnalytics = {
      userId: 'test_anonymous_user_' + Date.now(),
      testData: true,
      timestamp: new Date().toISOString(),
    };
    
    const analyticsRef = doc(collection(db, 'spending_patterns'), `test_${Date.now()}`);
    await setDoc(analyticsRef, testAnalytics);
    
    console.log('✅ Anonymous analytics write successful');
    
    // Clean up
    await deleteDoc(analyticsRef);
    console.log('🧹 Analytics test cleanup completed');
    
    console.log('✅ Aivest collections test passed');
    return true;
    
  } catch (error: any) {
    console.error('❌ Aivest collections test failed:', error.message);
    return false;
  }
};

export default app;