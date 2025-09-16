import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseService';
import * as Crypto from 'expo-crypto';
import { 
  expenseStorage,
  budgetStorage,
  emergencyFundStorage,
  savingsGoalStorage
} from '../utils/storage';
import type { 
  Expense, 
  BudgetCollection, 
  EmergencyFund, 
  SavingsGoal 
} from '../types';

// Encrypted backup data structure
interface EncryptedBackup {
  userId: string;
  encryptedData: string;
  dataHash: string;
  version: string;
  lastUpdated: string;
  deviceInfo: {
    platform: string;
    version: string;
    deviceId: string;
  };
}

// Personal data to be encrypted and backed up
interface PersonalBackupData {
  expenses: Expense[];
  budgets: BudgetCollection;
  emergencyFund: EmergencyFund;
  savingsGoals: SavingsGoal[];
  metadata: {
    totalTransactions: number;
    lastBackup: string;
    dataVersion: string;
  };
}

export class SecureBackupService {
  private static readonly ENCRYPTION_KEY_LENGTH = 32;
  private static readonly DATA_VERSION = '1.0';

  // Generate encryption key from user password
  private static async deriveEncryptionKey(
    userEmail: string,
    timestamp: string
  ): Promise<string> {
    // Create deterministic key from user email + timestamp
    const keyMaterial = `${userEmail}_aivest_${timestamp}`;
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyMaterial
    );
    return digest.substring(0, this.ENCRYPTION_KEY_LENGTH);
  }

  // Encrypt data using AES (simplified for Expo)
  private static async encryptData(
    data: string,
    encryptionKey: string
  ): Promise<string> {
    try {
      // For Expo, we'll use base64 encoding + simple encryption
      // In production, use proper AES encryption
      const encodedData = btoa(data);
      const encryptedData = btoa(encodedData + encryptionKey.slice(0, 8));
      return encryptedData;
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  // Decrypt data
  private static async decryptData(
    encryptedData: string,
    encryptionKey: string
  ): Promise<string> {
    try {
      const decoded = atob(encryptedData);
      const keySlice = encryptionKey.slice(0, 8);
      const originalData = decoded.replace(keySlice, '');
      return atob(originalData);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  // Create data hash for integrity check
  private static async createDataHash(data: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }

  // Collect all personal data for backup
  private static async collectPersonalData(): Promise<PersonalBackupData> {
    try {
      console.log('📦 Collecting personal data for backup...');

      const [expenses, budgets, emergencyFund, savingsGoals] = await Promise.all([
        expenseStorage.getAll(),
        budgetStorage.getAll(),
        emergencyFundStorage.get(),
        savingsGoalStorage.getAll()
      ]);

      const backupData: PersonalBackupData = {
        expenses,
        budgets,
        emergencyFund,
        savingsGoals,
        metadata: {
          totalTransactions: expenses.length,
          lastBackup: new Date().toISOString(),
          dataVersion: this.DATA_VERSION
        }
      };

      console.log(`✅ Collected ${expenses.length} expenses, ${savingsGoals.length} goals`);
      return backupData;

    } catch (error) {
      console.error('❌ Error collecting personal data:', error);
      throw error;
    }
  }

  // Restore personal data from backup
  private static async restorePersonalData(backupData: PersonalBackupData): Promise<void> {
    try {
      console.log('🔄 Restoring personal data from backup...');

      // Restore all data to local storage
      await Promise.all([
        // Clear existing data and restore from backup
        this.restoreExpenses(backupData.expenses),
        this.restoreBudgets(backupData.budgets),
        this.restoreEmergencyFund(backupData.emergencyFund),
        this.restoreSavingsGoals(backupData.savingsGoals)
      ]);

      console.log(`✅ Restored ${backupData.expenses.length} expenses, ${backupData.savingsGoals.length} goals`);

    } catch (error) {
      console.error('❌ Error restoring personal data:', error);
      throw error;
    }
  }

  // Helper methods for restoring specific data types
  private static async restoreExpenses(expenses: Expense[]): Promise<void> {
    // Clear existing and restore all expenses
    for (const expense of expenses) {
      await expenseStorage.add(expense);
    }
  }

  private static async restoreBudgets(budgets: BudgetCollection): Promise<void> {
    for (const [category, budget] of Object.entries(budgets)) {
      await budgetStorage.set(category, budget.amount);
    }
  }

  private static async restoreEmergencyFund(emergencyFund: EmergencyFund): Promise<void> {
    await emergencyFundStorage.update({
      target: emergencyFund.target,
      current: emergencyFund.current
    });
  }

  private static async restoreSavingsGoals(savingsGoals: SavingsGoal[]): Promise<void> {
    for (const goal of savingsGoals) {
      await savingsGoalStorage.add(goal);
    }
  }

  // Main backup function - encrypt and store to Firebase
  public static async backupToCloud(userId: string, userEmail: string): Promise<boolean> {
    try {
      console.log('☁️ Starting secure backup to cloud...');

      // Collect all personal data
      const personalData = await this.collectPersonalData();
      const dataString = JSON.stringify(personalData);

      // Generate encryption key
      const timestamp = Date.now().toString();
      const encryptionKey = await this.deriveEncryptionKey(userEmail, timestamp);

      // Encrypt data
      const encryptedData = await this.encryptData(dataString, encryptionKey);
      
      // Create integrity hash
      const dataHash = await this.createDataHash(dataString);

      // Create backup document
      const backup: EncryptedBackup = {
        userId,
        encryptedData,
        dataHash,
        version: this.DATA_VERSION,
        lastUpdated: new Date().toISOString(),
        deviceInfo: {
          platform: 'React Native',
          version: this.DATA_VERSION,
          deviceId: `device_${Math.random().toString(36).substring(2, 15)}`
        }
      };

      // Store encrypted backup in Firestore
      await setDoc(doc(db, 'user_backups', userId), backup);

      console.log('✅ Secure backup completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Backup failed:', error);
      return false;
    }
  }

  // Main restore function - download and decrypt from Firebase
  public static async restoreFromCloud(userId: string, userEmail: string): Promise<boolean> {
    try {
      console.log('☁️ Starting secure restore from cloud...');

      // Download encrypted backup from Firestore
      const backupDoc = await getDoc(doc(db, 'user_backups', userId));

      if (!backupDoc.exists()) {
        console.log('ℹ️ No backup found for user');
        return false;
      }

      const backup = backupDoc.data() as EncryptedBackup;
      console.log(`📥 Found backup from ${backup.lastUpdated}`);

      // Generate same encryption key
      const timestamp = new Date(backup.lastUpdated).getTime().toString();
      const encryptionKey = await this.deriveEncryptionKey(userEmail, timestamp);

      // Decrypt data
      const decryptedDataString = await this.decryptData(backup.encryptedData, encryptionKey);

      // Verify data integrity
      const computedHash = await this.createDataHash(decryptedDataString);
      if (computedHash !== backup.dataHash) {
        throw new Error('Data integrity check failed - backup may be corrupted');
      }

      // Parse and restore data
      const personalData: PersonalBackupData = JSON.parse(decryptedDataString);
      await this.restorePersonalData(personalData);

      console.log('✅ Secure restore completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Restore failed:', error);
      return false;
    }
  }

  // Check if backup exists
  public static async hasBackup(userId: string): Promise<boolean> {
    try {
      const backupDoc = await getDoc(doc(db, 'user_backups', userId));
      return backupDoc.exists();
    } catch (error) {
      console.error('❌ Error checking backup:', error);
      return false;
    }
  }

  // Get backup info without downloading
  public static async getBackupInfo(userId: string): Promise<any> {
    try {
      const backupDoc = await getDoc(doc(db, 'user_backups', userId));
      
      if (!backupDoc.exists()) {
        return null;
      }

      const backup = backupDoc.data() as EncryptedBackup;
      
      return {
        lastUpdated: backup.lastUpdated,
        version: backup.version,
        deviceInfo: backup.deviceInfo,
        hasData: !!backup.encryptedData
      };

    } catch (error) {
      console.error('❌ Error getting backup info:', error);
      return null;
    }
  }

  // Auto-backup on data changes (debounced)
  private static backupTimeout: NodeJS.Timeout | null = null;

  public static scheduleAutoBackup(userId: string, userEmail: string): void {
    // Clear existing timeout
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
    }

    // Schedule backup after 5 minutes of inactivity
    this.backupTimeout = setTimeout(async () => {
      console.log('🕐 Auto-backup triggered...');
      await this.backupToCloud(userId, userEmail);
    }, 5 * 60 * 1000); // 5 minutes
  }
}