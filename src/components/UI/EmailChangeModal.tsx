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

interface EmailChangeModalProps {
  visible: boolean;
  onClose: () => void;
  onEmailUpdate: (newEmail: string, password: string) => Promise<boolean>;
  currentEmail: string;
}

export const EmailChangeModal: React.FC<EmailChangeModalProps> = ({
  visible,
  onClose,
  onEmailUpdate,
  currentEmail,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter your current password.');
      return;
    }

    setLoading(true);
    try {
      const success = await onEmailUpdate(newEmail, password);
      if (success) {
        onClose();
        setNewEmail('');
        setPassword('');
      }
    } catch (error) {
      console.error('Email update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewEmail('');
    setPassword('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Change Email</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={24} color="#2563eb" />
            <Text style={styles.infoText}>
              You'll need to verify your new email address after changing it.
            </Text>
          </View>

          <View style={styles.currentEmailSection}>
            <Text style={styles.label}>Current Email</Text>
            <Text style={styles.currentEmail}>{currentEmail}</Text>
          </View>

          <Input
            label="New Email Address"
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="Enter new email address"
            keyboardType="email-address"
            style={styles.input}
          />

          <Input
            label="Current Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your current password"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.disclaimer}>
            For security, we need your current password to verify your identity before changing your email.
          </Text>

          <Button
            title={loading ? 'Updating Email...' : 'Update Email'}
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitButton}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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
  disclaimer: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 24,
    lineHeight: 16,
  },
  submitButton: {
    marginBottom: 20,
  },
});