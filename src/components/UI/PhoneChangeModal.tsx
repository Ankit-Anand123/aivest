import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Input } from './Input';
import { firebaseOtpService } from '../../services/firebaseOtpService';

interface PhoneChangeModalProps {
  visible: boolean;
  onClose: () => void;
  onPhoneUpdate: (newPhone: string) => Promise<boolean>;
  currentPhone?: string;
}

export const PhoneChangeModal: React.FC<PhoneChangeModalProps> = ({
  visible,
  onClose,
  onPhoneUpdate,
  currentPhone,
}) => {
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!newPhone || newPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const result = await firebaseOtpService.sendMockPhoneOTP(`+91${newPhone}`);
      if (result.success) {
        setOtpSent(true);
        startTimer();
        Alert.alert('OTP Sent', result.message);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const result = await firebaseOtpService.verifyMockPhoneOTP(otp);
      if (result.success) {
        const success = await onPhoneUpdate(`+91${newPhone}`);
        if (success) {
          handleClose();
          Alert.alert('Success', 'Phone number updated successfully!');
        }
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPhone('');
    setOtp('');
    setOtpSent(false);
    setTimer(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
              <View style={phoneStyles.container}>
        <View style={phoneStyles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={phoneStyles.title}>Change Phone Number</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={phoneStyles.content}>
          {currentPhone && (
            <View style={phoneStyles.currentEmailSection}>
              <Text style={phoneStyles.label}>Current Phone</Text>
              <Text style={phoneStyles.currentEmail}>{currentPhone}</Text>
            </View>
          )}

          <Input
            label="New Phone Number"
            value={newPhone}
            onChangeText={setNewPhone}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            style={phoneStyles.input}
            editable={!otpSent}
          />

          {!otpSent ? (
            <Button
              title={loading ? 'Sending OTP...' : 'Send OTP'}
              onPress={handleSendOTP}
              disabled={loading}
              style={phoneStyles.submitButton}
            />
          ) : (
            <>
              <Input
                label="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit OTP"
                keyboardType="numeric"
                maxLength={6}
                style={phoneStyles.input}
              />

              <View style={phoneStyles.otpActions}>
                <Button
                  title={loading ? 'Verifying...' : 'Verify OTP'}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  style={phoneStyles.verifyButton}
                />

                {timer > 0 ? (
                  <Text style={phoneStyles.timerText}>Resend in {timer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOTP}>
                    <Text style={phoneStyles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={phoneStyles.disclaimer}>
                DEV MODE: Use OTP "123456" for testing
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Add styles for PhoneChangeModal
const phoneStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  currentEmailSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  currentEmail: {
    fontSize: 16,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginBottom: 20,
  },
  otpActions: {
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButton: {
    width: '100%',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
});