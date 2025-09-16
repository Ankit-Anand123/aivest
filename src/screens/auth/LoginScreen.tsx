import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';
import { rememberMeStorage, biometricStorage } from '../../utils/authStorage';
import { useFormState } from '../../hooks/useStorage';
import { LoginCredentials, SignupCredentials } from '../../types/auth';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login, loading, error, clearError } = useFirebaseAuth();
  const [showBiometric, setShowBiometric] = useState(false);
  
  const { state: formData, errors, updateField, isValid } = useFormState<LoginCredentials>(
    { email: '', password: '', rememberMe: false },
    validateLoginForm
  );

  useEffect(() => {
    loadRememberedEmail();
    checkBiometricAvailability();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error);
      clearError();
    }
  }, [error]);

  const loadRememberedEmail = async () => {
    const rememberedEmail = await rememberMeStorage.getRememberedEmail();
    if (rememberedEmail) {
      updateField('email')(rememberedEmail);
      updateField('rememberMe')(true);
    }
  };

  const checkBiometricAvailability = async () => {
    const biometricData = await biometricStorage.isBiometricAvailable();
    setShowBiometric(biometricData.enabled && biometricData.type !== 'none');
  };

  const handleLogin = async () => {
    if (!isValid) return;

    const success = await login(formData);
    if (!success) {
      // Error is handled in useEffect above
    }
  };

  const handleBiometricLogin = async () => {
    const success = await biometricLogin();
    if (!success) {
      Alert.alert('Authentication Failed', 'Please try again or use your password.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🛡️ Aivest</Text>
          <Text style={styles.subtitle}>Your AI Financial Companion</Text>
        </View>

        {/* Login Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={updateField('email')}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={updateField('password')}
              placeholder="Enter your password"
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Remember Me */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => updateField('rememberMe')(!formData.rememberMe)}
          >
            <View style={[styles.checkbox, formData.rememberMe && styles.checkboxChecked]}>
              {formData.rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Remember me</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, (!isValid || loading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!isValid || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Biometric Login */}
          {showBiometric && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleBiometricLogin}
            >
              <Text style={styles.secondaryButtonText}>🔒 Use Biometric Login</Text>
            </TouchableOpacity>
          )}

          {/* Forgot Password */}
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Validation function
function validateLoginForm(data: LoginCredentials): Record<keyof LoginCredentials, string | undefined> {
  const errors: Record<keyof LoginCredentials, string | undefined> = {
    email: undefined,
    password: undefined,
    rememberMe: undefined,
  };

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return errors;
}

// SignUp Screen
export const SignUpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { signup, loading, error, clearError } = useFirebaseAuth();
  
  const { state: formData, errors, updateField, isValid } = useFormState<SignupCredentials>(
    { 
      email: '', 
      password: '', 
      confirmPassword: '', 
      firstName: '', 
      lastName: '', 
      phone: '',
      agreeToTerms: false 
    },
    validateSignupForm
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Registration Error', error);
      clearError();
    }
  }, [error]);

  const handleSignup = async () => {
    if (!isValid) return;

    const success = await signup(formData);
    if (!success) {
      // Error is handled in useEffect above
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🛡️ Aivest</Text>
          <Text style={styles.subtitle}>Join Your Financial Journey</Text>
        </View>

        {/* Signup Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          
          {/* Name Fields */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                value={formData.firstName}
                onChangeText={updateField('firstName')}
                placeholder="First name"
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                value={formData.lastName}
                onChangeText={updateField('lastName')}
                placeholder="Last name"
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={updateField('email')}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={updateField('phone')}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={updateField('password')}
              placeholder="Create a password"
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              value={formData.confirmPassword}
              onChangeText={updateField('confirmPassword')}
              placeholder="Confirm your password"
              secureTextEntry
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Terms Agreement */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => updateField('agreeToTerms')(!formData.agreeToTerms)}
          >
            <View style={[styles.checkbox, formData.agreeToTerms && styles.checkboxChecked]}>
              {formData.agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, (!isValid || loading) && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={!isValid || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Validation function for signup
function validateSignupForm(data: SignupCredentials): Record<keyof SignupCredentials, string | undefined> {
  const errors: Record<keyof SignupCredentials, string | undefined> = {
    email: undefined,
    password: undefined,
    confirmPassword: undefined,
    firstName: undefined,
    lastName: undefined,
    phone: undefined,
    agreeToTerms: undefined,
  };

  if (!data.firstName) {
    errors.firstName = 'First name is required';
  }

  if (!data.lastName) {
    errors.lastName = 'Last name is required';
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
    errors.password = 'Password must contain uppercase, lowercase, and number';
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!data.agreeToTerms) {
    errors.agreeToTerms = 'You must agree to terms and conditions';
  }

  return errors;
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 16,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  link: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default LoginScreen;