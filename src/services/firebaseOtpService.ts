import { 
  sendEmailVerification, 
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { auth } from './firebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OTPResponse {
  success: boolean;
  message: string;
  verificationId?: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
}

class FirebaseOtpService {
  
  // Send Email Verification (Simple & Clean)
  async sendEmailVerification(): Promise<EmailVerificationResponse> {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return {
          success: false,
          message: 'Please sign in first.'
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          message: 'Email is already verified.'
        };
      }

      // Simple verification without custom URL
      await sendEmailVerification(user);
      
      return {
        success: true,
        message: 'Verification email sent! Check your inbox and spam folder.'
      };
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      // Handle common errors
      if (error.code === 'auth/too-many-requests') {
        return {
          success: false,
          message: 'Too many requests. Please wait 10-15 minutes and try again.'
        };
      }
      
      return {
        success: false,
        message: 'Failed to send verification email. Please try again.'
      };
    }
  }

  // Update Email with Password Confirmation
  async updateEmailWithPassword(newEmail: string, currentPassword: string): Promise<EmailVerificationResponse> {
    try {
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        return {
          success: false,
          message: 'Please sign in first.'
        };
      }

      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update to new email
      await updateEmail(user, newEmail);

      // Send verification to new email
      await sendEmailVerification(user);
      
      return {
        success: true,
        message: `Email updated to ${newEmail}. Please verify your new email.`
      };
    } catch (error: any) {
      console.error('Email update error:', error);
      
      // Handle specific errors
      if (error.code === 'auth/wrong-password') {
        return {
          success: false,
          message: 'Incorrect password. Please try again.'
        };
      } else if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          message: 'This email is already in use.'
        };
      } else if (error.code === 'auth/requires-recent-login') {
        return {
          success: false,
          message: 'Please sign out and sign in again for security.'
        };
      }
      
      return {
        success: false,
        message: 'Failed to update email. Please try again.'
      };
    }
  }

  // Check Email Verification Status
  async isEmailVerified(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      // Refresh user data
      await user.reload();
      return user.emailVerified;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }

  // Refresh User Data
  async refreshUser(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      await user.reload();
      return user.emailVerified;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return false;
    }
  }

  // Mock Phone OTP for Development
  async sendMockPhoneOTP(phoneNumber: string): Promise<OTPResponse> {
    try {
      console.log(`📱 DEV: Sending OTP to ${phoneNumber}`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store for verification
      await AsyncStorage.setItem('mockPhoneOTP', '123456');
      await AsyncStorage.setItem('mockPhoneNumber', phoneNumber);
      
      return {
        success: true,
        message: `OTP sent to ${phoneNumber}. Use: 123456`,
        verificationId: 'mock_verification'
      };
    } catch (error) {
      console.error('Mock OTP error:', error);
      return {
        success: false,
        message: 'Failed to send OTP.'
      };
    }
  }

  // Verify Mock Phone OTP
  async verifyMockPhoneOTP(otp: string): Promise<{ success: boolean; message: string; phoneNumber?: string }> {
    try {
      const storedOTP = await AsyncStorage.getItem('mockPhoneOTP');
      const storedPhone = await AsyncStorage.getItem('mockPhoneNumber');
      
      if (!storedOTP || !storedPhone) {
        return {
          success: false,
          message: 'No pending verification found.'
        };
      }

      if (otp === storedOTP) {
        // Clear stored data
        await AsyncStorage.removeItem('mockPhoneOTP');
        await AsyncStorage.removeItem('mockPhoneNumber');
        
        return {
          success: true,
          message: 'Phone number verified successfully!',
          phoneNumber: storedPhone
        };
      } else {
        return {
          success: false,
          message: 'Invalid OTP. Please try again.'
        };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        message: 'Verification failed.'
      };
    }
  }

  // Get Current User Info
  getCurrentUser() {
    return auth.currentUser;
  }

  // Sign Out User
  async signOut(): Promise<void> {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}

export const firebaseOtpService = new FirebaseOtpService();