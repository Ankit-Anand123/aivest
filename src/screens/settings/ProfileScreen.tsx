import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';
import { SecureBackupService } from '../../services/secureBackupService';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { useFocusEffect } from '@react-navigation/native';
import { expenseStorage, budgetStorage, savingsGoalStorage, emergencyFundStorage } from '../../utils/storage';
import { firebaseOtpService } from '../../services/firebaseOtpService';
import { EmailChangeModal } from '../../components/UI/EmailChangeModal';
import { PhoneChangeModal } from '../../components/UI/PhoneChangeModal';


interface ProfileScreenProps { }

const ProfileScreen: React.FC<ProfileScreenProps> = () => {
    const { user, firebaseUser, logout, updateProfile, updatePreferences, changePassword } = useFirebaseAuth();
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [backupInfo, setBackupInfo] = useState<any>(null);
    const [backupLoading, setBackupLoading] = useState(false);
    const [stats, setStats] = useState({
        totalExpenses: 0,
        budgetCategories: 0,
        savingsGoals: 0,
        emergencyFundProgress: 0,
    });
    const [emailChangeModalVisible, setEmailChangeModalVisible] = useState(false);
    const [phoneChangeModalVisible, setPhoneChangeModalVisible] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);

    // Profile form state
    const [editForm, setEditForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
        address: '',
        city: '',
        country: 'India',
    });

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Preferences state
    const [preferences, setPreferences] = useState({
        currency: user?.preferences?.currency || 'INR',
        language: user?.preferences?.language || 'en',
        theme: user?.preferences?.theme || 'auto',
        notifications: {
            budgetAlerts: user?.preferences?.notifications?.budgetAlerts ?? true,
            scamAlerts: user?.preferences?.notifications?.scamAlerts ?? true,
            savingsReminders: user?.preferences?.notifications?.savingsReminders ?? true,
            weeklyReports: user?.preferences?.notifications?.weeklyReports ?? false,
        },
    });

    useFocusEffect(
        React.useCallback(() => {
            loadProfileStats();
        }, [])
    );

    // Load backup info on component mount
    useEffect(() => {
        loadBackupInfo();
    }, [firebaseUser]);

    useFocusEffect(
        React.useCallback(() => {
            const checkEmailVerification = async () => {
                const isVerified = await firebaseOtpService.isEmailVerified();
                setEmailVerified(isVerified);
            };

            checkEmailVerification();
        }, [])
    );

    // Update form when user data changes
    useEffect(() => {
        if (user) {
            setEditForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                address: '', // You can add address to User type if needed
                city: '',
                country: 'India',
            });
        }
    }, [user]);

    const loadBackupInfo = async () => {
        try {
            if (firebaseUser?.uid) {
                const info = await SecureBackupService.getBackupInfo(firebaseUser.uid);
                setBackupInfo(info);
            }
        } catch (error) {
            console.error('Error loading backup info:', error);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await logout();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            const success = await updateProfile(editForm);
            if (success) {
                setEditModalVisible(false);
                Alert.alert('Success', 'Profile updated successfully!');
            } else {
                Alert.alert('Error', 'Failed to update profile. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailUpdate = async (newEmail: string, password: string): Promise<boolean> => {
        try {
            const result = await firebaseOtpService.updateEmailWithVerification(newEmail, password);

            if (result.success) {
                Alert.alert('Success', result.message);
                // Refresh email verification status
                setTimeout(async () => {
                    const isVerified = await firebaseOtpService.isEmailVerified();
                    setEmailVerified(isVerified);
                }, 1000);
                return true;
            } else {
                Alert.alert('Error', result.message);
                return false;
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update email. Please try again.');
            return false;
        }
    };

    const handlePhoneUpdate = async (newPhone: string): Promise<boolean> => {
        try {
            // Update the phone number in your user profile
            const success = await updateProfile({ phone: newPhone });
            return success;
        } catch (error) {
            console.error('Phone update error:', error);
            return false;
        }
    };

    const handleSendEmailVerification = async () => {
        try {
            const result = await firebaseOtpService.sendEmailVerification();
            Alert.alert(
                result.success ? 'Verification Sent' : 'Error',
                result.message
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to send verification email.');
        }
    };

    const loadProfileStats = async () => {
        try {
            console.log('🔄 Loading profile statistics...');

            // Load expenses count
            const expenses = await expenseStorage.getAll();

            // Load budgets count
            const budgets = await budgetStorage.getAll();
            const budgetCount = Object.keys(budgets).length;

            // Load savings goals count
            const savingsGoals = await savingsGoalStorage.getAll();

            // Load emergency fund progress
            const emergencyFund = await emergencyFundStorage.get();
            const emergencyProgress = emergencyFund && emergencyFund.target > 0
                ? Math.round((emergencyFund.current / emergencyFund.target) * 100)
                : 0;

            setStats({
                totalExpenses: expenses.length,
                budgetCategories: budgetCount,
                savingsGoals: savingsGoals.length,
                emergencyFundProgress: emergencyProgress,
            });

            console.log(`✅ Stats loaded: ${expenses.length} expenses, ${budgetCount} budgets, ${savingsGoals.length} goals`);
        } catch (error) {
            console.error('❌ Error loading profile stats:', error);
        }
    };

    const handlePasswordChange = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            Alert.alert('Error', 'New passwords do not match.');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters long.');
            return;
        }

        try {
            setLoading(true);
            const success = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);

            if (success) {
                setPasswordModalVisible(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                Alert.alert('Success', 'Password changed successfully!');
            } else {
                Alert.alert('Error', 'Failed to change password. Please check your current password and try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePreferencesUpdate = async (key: string, value: any) => {
        try {
            const updatedPreferences = { ...preferences };
            if (key.includes('.')) {
                const [parentKey, childKey] = key.split('.');
                updatedPreferences[parentKey] = {
                    ...updatedPreferences[parentKey],
                    [childKey]: value,
                };
            } else {
                updatedPreferences[key] = value;
            }

            setPreferences(updatedPreferences);
            await updatePreferences(updatedPreferences);
        } catch (error) {
            Alert.alert('Error', 'Failed to update preferences.');
        }
    };

    const handleManualBackup = async () => {
        try {
            setBackupLoading(true);
            const success = await SecureBackupService.triggerManualBackup(
                firebaseUser?.uid || '',
                user?.email || ''
            );

            if (success) {
                Alert.alert('Success', 'Backup completed successfully!');
                await loadBackupInfo(); // Refresh backup info
            } else {
                Alert.alert('Error', 'Backup failed. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'Backup failed. Please try again.');
        } finally {
            setBackupLoading(false);
        }
    };

    const handleRestoreBackup = async () => {
        Alert.alert(
            'Restore Backup',
            'This will restore your budgets and emergency fund from the cloud backup. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    onPress: async () => {
                        try {
                            setBackupLoading(true);

                            // Add timeout to prevent hanging
                            const restorePromise = SecureBackupService.restoreFromCloud(
                                firebaseUser?.uid || '',
                                user?.email || ''
                            );

                            const timeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Restore timeout')), 30000)
                            );

                            const success = await Promise.race([restorePromise, timeoutPromise]);

                            if (success) {
                                Alert.alert(
                                    'Success',
                                    'Budgets and emergency fund restored successfully! Other data was preserved to avoid duplicates.'
                                );
                            } else {
                                Alert.alert('Info', 'Restore completed but no changes were made. Your data may already be up to date.');
                            }
                        } catch (error) {
                            console.error('Restore error:', error);
                            if (error.message === 'Restore timeout') {
                                Alert.alert('Timeout', 'Restore is taking too long. Please try again.');
                            } else {
                                Alert.alert('Error', 'Restore failed. Your local data is safe and unchanged.');
                            }
                        } finally {
                            setBackupLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </Card>
    );

    const ProfileItem = ({ icon, label, value, onPress, showChevron = false, iconColor = "#6b7280" }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        value: string;
        onPress?: () => void;
        showChevron?: boolean;
        iconColor?: string;
    }) => (
        <TouchableOpacity
            style={styles.profileItem}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.profileItemLeft}>
                <Ionicons name={icon} size={20} color={iconColor} />
                <Text style={[styles.profileItemLabel, onPress && { color: iconColor }]}>{label}</Text>
            </View>
            <View style={styles.profileItemRight}>
                <Text style={styles.profileItemValue}>{value}</Text>
                {showChevron && <Ionicons name="chevron-forward" size={16} color="#9ca3af" />}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Profile Header */}
            <Card style={styles.header}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={40} color="#ffffff" />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.userName}>
                            {user?.firstName} {user?.lastName}
                        </Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.verifiedText}>Verified Account</Text>
                        </View>
                    </View>
                </View>
            </Card>

            {/* Account Information */}
            <ProfileSection title="Account Information">
                <ProfileItem
                    icon="person-outline"
                    label="Name"
                    value={`${user?.firstName} ${user?.lastName}`}
                    onPress={() => setEditModalVisible(true)}
                    showChevron
                />
                <ProfileItem
                    icon="mail-outline"
                    label="Email"
                    value={user?.email || 'Not provided'}
                    onPress={() => setEmailChangeModalVisible(true)}
                    showChevron
                    iconColor={emailVerified ? "#10b981" : "#f59e0b"}
                />
                {!emailVerified && (
                    <ProfileItem
                        icon="warning-outline"
                        label="Email Verification"
                        value="Click to verify your email"
                        onPress={handleSendEmailVerification}
                        showChevron
                        iconColor="#ef4444"
                    />
                )}
                <ProfileItem
                    icon="call-outline"
                    label="Phone"
                    value={user?.phone || 'Not provided'}
                    onPress={() => setPhoneChangeModalVisible(true)}
                    showChevron
                />
                <ProfileItem
                    icon="location-outline"
                    label="Location"
                    value="Coimbatore, Tamil Nadu"
                    onPress={() => setEditModalVisible(true)}
                    showChevron
                />
            </ProfileSection>


            {/* Data & Backup */}
            <ProfileSection title="Data & Backup">
                <ProfileItem
                    icon="cloud-outline"
                    label="Last Backup"
                    value={backupInfo ? formatDate(backupInfo.lastUpdated) : 'Never'}
                />
                {backupInfo && (
                    <>
                        <ProfileItem
                            icon="receipt-outline"
                            label="Total Expenses"
                            value={`${stats.totalExpenses} transactions`}
                            iconColor="#ef4444"
                        />
                        <ProfileItem
                            icon="wallet-outline"
                            label="Budget Categories"
                            value={`${stats.budgetCategories} categories set`}
                            iconColor="#2563eb"
                        />
                        <ProfileItem
                            icon="trending-up-outline"
                            label="Savings Goals"
                            value={`${stats.savingsGoals} active goals`}
                            iconColor="#10b981"
                        />
                        <ProfileItem
                            icon="shield-checkmark-outline"
                            label="Emergency Fund"
                            value={`${stats.emergencyFundProgress}% complete`}
                            iconColor="#f59e0b"
                        />
                    </>
                )}
                <ProfileItem
                    icon="cloud-upload"
                    label={backupLoading ? 'Backing up...' : 'Backup Now'}
                    value=""
                    onPress={backupLoading ? undefined : handleManualBackup}
                    iconColor="#2563eb"
                    showChevron={!backupLoading}
                />
                {backupInfo && (
                    <ProfileItem
                        icon="cloud-download"
                        label={backupLoading ? 'Restoring...' : 'Restore from Backup'}
                        value=""
                        onPress={backupLoading ? undefined : handleRestoreBackup}
                        iconColor="#059669"
                        showChevron={!backupLoading}
                    />
                )}
            </ProfileSection>

            {/* Preferences */}
            <ProfileSection title="Preferences">
                <ProfileItem
                    icon="card-outline"
                    label="Currency"
                    value={preferences.currency}
                    onPress={() => {
                        Alert.alert(
                            'Select Currency',
                            'Choose your preferred currency',
                            [
                                { text: 'INR (₹)', onPress: () => handlePreferencesUpdate('currency', 'INR') },
                                { text: 'USD ($)', onPress: () => handlePreferencesUpdate('currency', 'USD') },
                                { text: 'EUR (€)', onPress: () => handlePreferencesUpdate('currency', 'EUR') },
                                { text: 'Cancel', style: 'cancel' },
                            ]
                        );
                    }}
                    showChevron
                />
                <ProfileItem
                    icon="language-outline"
                    label="Language"
                    value={preferences.language === 'en' ? 'English' : 'Hindi'}
                    onPress={() => {
                        Alert.alert(
                            'Select Language',
                            'Choose your preferred language',
                            [
                                { text: 'English', onPress: () => handlePreferencesUpdate('language', 'en') },
                                { text: 'हिंदी', onPress: () => handlePreferencesUpdate('language', 'hi') },
                                { text: 'Cancel', style: 'cancel' },
                            ]
                        );
                    }}
                    showChevron
                />
                <ProfileItem
                    icon="moon-outline"
                    label="Theme"
                    value={preferences.theme === 'auto' ? 'Auto' : preferences.theme === 'dark' ? 'Dark' : 'Light'}
                    onPress={() => {
                        Alert.alert(
                            'Select Theme',
                            'Choose your preferred theme',
                            [
                                { text: 'Auto', onPress: () => handlePreferencesUpdate('theme', 'auto') },
                                { text: 'Light', onPress: () => handlePreferencesUpdate('theme', 'light') },
                                { text: 'Dark', onPress: () => handlePreferencesUpdate('theme', 'dark') },
                                { text: 'Cancel', style: 'cancel' },
                            ]
                        );
                    }}
                    showChevron
                />
            </ProfileSection>

            {/* Notifications */}
            <ProfileSection title="Notification Settings">
                <View style={styles.notificationItem}>
                    <Text style={styles.notificationLabel}>Budget Alerts</Text>
                    <TouchableOpacity
                        style={[styles.toggle, preferences.notifications.budgetAlerts && styles.toggleActive]}
                        onPress={() => handlePreferencesUpdate('notifications.budgetAlerts', !preferences.notifications.budgetAlerts)}
                    >
                        <View style={[styles.toggleThumb, preferences.notifications.budgetAlerts && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                </View>
                <View style={styles.notificationItem}>
                    <Text style={styles.notificationLabel}>Scam Alerts</Text>
                    <TouchableOpacity
                        style={[styles.toggle, preferences.notifications.scamAlerts && styles.toggleActive]}
                        onPress={() => handlePreferencesUpdate('notifications.scamAlerts', !preferences.notifications.scamAlerts)}
                    >
                        <View style={[styles.toggleThumb, preferences.notifications.scamAlerts && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                </View>
                <View style={styles.notificationItem}>
                    <Text style={styles.notificationLabel}>Savings Reminders</Text>
                    <TouchableOpacity
                        style={[styles.toggle, preferences.notifications.savingsReminders && styles.toggleActive]}
                        onPress={() => handlePreferencesUpdate('notifications.savingsReminders', !preferences.notifications.savingsReminders)}
                    >
                        <View style={[styles.toggleThumb, preferences.notifications.savingsReminders && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                </View>
                <View style={styles.notificationItem}>
                    <Text style={styles.notificationLabel}>Weekly Reports</Text>
                    <TouchableOpacity
                        style={[styles.toggle, preferences.notifications.weeklyReports && styles.toggleActive]}
                        onPress={() => handlePreferencesUpdate('notifications.weeklyReports', !preferences.notifications.weeklyReports)}
                    >
                        <View style={[styles.toggleThumb, preferences.notifications.weeklyReports && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                </View>
            </ProfileSection>

            {/* Security */}
            <ProfileSection title="Security">
                <ProfileItem
                    icon="key-outline"
                    label="Change Password"
                    value="••••••••"
                    onPress={() => setPasswordModalVisible(true)}
                    showChevron
                />
                <ProfileItem
                    icon="finger-print-outline"
                    label="Biometric Login"
                    value={user?.preferences?.security?.biometricEnabled ? "Enabled" : "Disabled"}
                    showChevron
                />
                <ProfileItem
                    icon="time-outline"
                    label="Session Timeout"
                    value={`${user?.preferences?.security?.sessionTimeout || 30} minutes`}
                    showChevron
                />
            </ProfileSection>

            {/* App Info */}
            <ProfileSection title="App Information">
                <ProfileItem
                    icon="information-circle-outline"
                    label="App Version"
                    value="1.0.0 (Beta)"
                />
                <ProfileItem
                    icon="help-circle-outline"
                    label="Help & Support"
                    value="Get help"
                    onPress={() => Alert.alert('Help & Support', 'Contact us at support@aivest.com')}
                    showChevron
                />
                <ProfileItem
                    icon="document-text-outline"
                    label="Privacy Policy"
                    value="View policy"
                    onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be available soon.')}
                    showChevron
                />
            </ProfileSection>

            {/* Logout Button */}
            <Card style={styles.section}>
                <Button
                    title="Logout"
                    variant="danger"
                    onPress={handleLogout}
                    disabled={loading}
                />
            </Card>

            {/* Edit Profile Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={handleSaveProfile} disabled={loading}>
                            <Text style={[styles.modalSave, loading && { opacity: 0.5 }]}>
                                {loading ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Input
                            label="First Name"
                            value={editForm.firstName}
                            onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
                            placeholder="Enter your first name"
                        />
                        <Input
                            label="Last Name"
                            value={editForm.lastName}
                            onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
                            placeholder="Enter your last name"
                        />
                        <Input
                            label="Phone Number"
                            value={editForm.phone}
                            onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                            placeholder="Enter your phone number"
                            keyboardType="phone-pad"
                        />
                        <Input
                            label="Address"
                            value={editForm.address}
                            onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                            placeholder="Enter your address"
                            multiline
                        />
                        <Input
                            label="City"
                            value={editForm.city}
                            onChangeText={(text) => setEditForm({ ...editForm, city: text })}
                            placeholder="Enter your city"
                        />
                    </ScrollView>
                </View>
            </Modal>

            {/* Password Change Modal */}
            <Modal
                visible={passwordModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <TouchableOpacity onPress={handlePasswordChange} disabled={loading}>
                            <Text style={[styles.modalSave, loading && { opacity: 0.5 }]}>
                                {loading ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Input
                            label="Current Password"
                            value={passwordForm.currentPassword}
                            onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                            placeholder="Enter current password"
                            secureTextEntry
                        />
                        <Input
                            label="New Password"
                            value={passwordForm.newPassword}
                            onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                            placeholder="Enter new password (min. 6 characters)"
                            secureTextEntry
                        />
                        <Input
                            label="Confirm New Password"
                            value={passwordForm.confirmPassword}
                            onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                            placeholder="Confirm new password"
                            secureTextEntry
                        />
                        <Text style={styles.passwordHint}>
                            Password must be at least 6 characters long and contain a mix of letters and numbers for better security.
                        </Text>
                    </ScrollView>
                </View>
            </Modal>
            <EmailChangeModal
                visible={emailChangeModalVisible}
                onClose={() => setEmailChangeModalVisible(false)}
                onEmailUpdate={handleEmailUpdate}
                currentEmail={user?.email || ''}
            />

            {/* Phone Change Modal */}
            <PhoneChangeModal
                visible={phoneChangeModalVisible}
                onClose={() => setPhoneChangeModalVisible(false)}
                onPhoneUpdate={handlePhoneUpdate}
                currentPhone={user?.phone}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        marginBottom: 16,
    },
    avatarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 8,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verifiedText: {
        fontSize: 12,
        color: '#10b981',
        marginLeft: 4,
        fontWeight: '500',
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    profileItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profileItemLabel: {
        fontSize: 16,
        color: '#374151',
        marginLeft: 12,
        flex: 1,
    },
    profileItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileItemValue: {
        fontSize: 14,
        color: '#6b7280',
        marginRight: 8,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    notificationLabel: {
        fontSize: 16,
        color: '#374151',
    },
    toggle: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#d1d5db',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleActive: {
        backgroundColor: '#2563eb',
    },
    toggleThumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#ffffff',
    },
    toggleThumbActive: {
        transform: [{ translateX: 20 }],
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalCancel: {
        fontSize: 16,
        color: '#6b7280',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalSave: {
        fontSize: 16,
        color: '#2563eb',
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    passwordHint: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
        lineHeight: 16,
        fontStyle: 'italic',
    },
});

export default ProfileScreen;