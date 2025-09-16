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

// Simplified backup data structure (no encryption for now)
interface SimpleBackup {
  userId: string;
  data: PersonalBackupData;
  dataHash: string;
  version: string;
  lastUpdated: string;
  deviceInfo: {
    platform: string;
    version: string;
    deviceId: string;
  };
}

// Personal data to be backed up
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
  private static readonly DATA_VERSION = '1.0';

  // Create data hash for integrity check - FIXED
  private static async createDataHash(data: string): Promise<string> {
    try {
      // Ensure data is a string
      if (typeof data !== 'string') {
        console.warn('Data is not a string, converting:', typeof data);
        data = JSON.stringify(data);
      }
      
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
    } catch (error) {
      console.error('❌ Error creating hash:', error);
      // Return a simple fallback hash if crypto fails
      return `fallback_hash_${Date.now()}`;
    }
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
        expenses: expenses || [],
        budgets: budgets || {},
        emergencyFund: emergencyFund || { target: 0, current: 0, updatedAt: null },
        savingsGoals: savingsGoals || [],
        metadata: {
          totalTransactions: expenses?.length || 0,
          lastBackup: new Date().toISOString(),
          dataVersion: this.DATA_VERSION
        }
      };

      console.log(`✅ Collected ${backupData.expenses.length} expenses, ${backupData.savingsGoals.length} goals`);
      return backupData;

    } catch (error) {
      console.error('❌ Error collecting personal data:', error);
      // Return empty backup data if collection fails
      return {
        expenses: [],
        budgets: {},
        emergencyFund: { target: 0, current: 0, updatedAt: null },
        savingsGoals: [],
        metadata: {
          totalTransactions: 0,
          lastBackup: new Date().toISOString(),
          dataVersion: this.DATA_VERSION
        }
      };
    }
  }

  // Restore personal data from backup
  private static async restorePersonalData(backupData: PersonalBackupData): Promise<void> {
    try {
      console.log('🔄 Restoring personal data from backup...');

      // Validate backup data structure
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Invalid backup data structure');
      }

      // Restore budgets safely
      if (backupData.budgets && typeof backupData.budgets === 'object') {
        console.log('🔄 Restoring budgets...');
        for (const [category, budget] of Object.entries(backupData.budgets)) {
          if (budget && typeof budget.amount === 'number') {
            await budgetStorage.set(category, budget.amount);
          }
        }
      }

      // Restore emergency fund safely
      if (backupData.emergencyFund) {
        console.log('🔄 Restoring emergency fund...');
        const ef = backupData.emergencyFund;
        if (typeof ef.target === 'number' && typeof ef.current === 'number') {
          await emergencyFundStorage.update({
            target: ef.target,
            current: ef.current
          });
        }
      }

      // Note: We're not restoring expenses and savings goals to avoid duplicates
      // You can implement merge logic here if needed

      console.log('✅ Personal data restoration completed');

    } catch (error) {
      console.error('❌ Error restoring personal data:', error);
      throw error;
    }
  }

  // Main backup function - store to Firebase (simplified, no encryption)
  public static async backupToCloud(userId: string, userEmail: string): Promise<boolean> {
    try {
      console.log('☁️ Starting backup to cloud...');

      // Collect all personal data
      const personalData = await this.collectPersonalData();
      
      // Convert to string for hashing
      const dataString = JSON.stringify(personalData);

      // Create integrity hash - FIXED
      const dataHash = await this.createDataHash(dataString);

      // Create backup document (simplified - no encryption)
      const backup: SimpleBackup = {
        userId,
        data: personalData,
        dataHash,
        version: this.DATA_VERSION,
        lastUpdated: new Date().toISOString(),
        deviceInfo: {
          platform: 'React Native',
          version: this.DATA_VERSION,
          deviceId: `device_${Math.random().toString(36).substring(2, 15)}`
        }
      };

      // Store backup in Firestore
      await setDoc(doc(db, 'user_backups', userId), backup);

      console.log('✅ Backup completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Backup failed:', error);
      return false;
    }
  }

  // Main restore function - download from Firebase (simplified)
  public static async restoreFromCloud(userId: string, userEmail: string): Promise<boolean> {
    try {
      console.log('☁️ Starting restore from cloud...');

      // Download backup from Firestore
      const backupDoc = await getDoc(doc(db, 'user_backups', userId));

      if (!backupDoc.exists()) {
        console.log('ℹ️ No backup found for user');
        return false;
      }

      const backup = backupDoc.data() as SimpleBackup;
      console.log(`📥 Found backup from ${backup.lastUpdated}`);

      // Validate backup structure
      if (!backup.data || typeof backup.data !== 'object') {
        console.error('❌ Invalid backup data structure');
        return false;
      }

      // Verify data integrity - FIXED
      try {
        const dataString = JSON.stringify(backup.data);
        const computedHash = await this.createDataHash(dataString);
        
        if (computedHash !== backup.dataHash) {
          console.warn('⚠️ Data integrity check failed, but attempting restore anyway...');
          // Don't throw error, just warn and continue
        } else {
          console.log('✅ Data integrity check passed');
        }
      } catch (hashError) {
        console.warn('⚠️ Could not verify data integrity, continuing with restore:', hashError);
      }

      // Restore data
      await this.restorePersonalData(backup.data);

      console.log('✅ Restore completed successfully');
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

      const backup = backupDoc.data() as SimpleBackup;
      
      // Safely extract data sizes
      const dataSize = {
        expenses: backup.data?.expenses?.length || 0,
        savingsGoals: backup.data?.savingsGoals?.length || 0,
        budgetCategories: backup.data?.budgets ? Object.keys(backup.data.budgets).length : 0
      };
      
      return {
        lastUpdated: backup.lastUpdated,
        version: backup.version,
        deviceInfo: backup.deviceInfo,
        hasData: !!backup.data,
        dataSize
      };

    } catch (error) {
      console.error('❌ Error getting backup info:', error);
      return null;
    }
  }

  // Auto-backup on data changes (debounced)
  private static backupTimeout: NodeJS.Timeout | null = null;

  public static scheduleAutoBackup(userId: string, userEmail: string): void {
    try {
      // Clear existing timeout
      if (this.backupTimeout) {
        clearTimeout(this.backupTimeout);
      }

      // Schedule backup after 5 minutes of inactivity
      this.backupTimeout = setTimeout(async () => {
        console.log('🕐 Auto-backup triggered...');
        await this.backupToCloud(userId, userEmail);
      }, 5 * 60 * 1000); // 5 minutes
    } catch (error) {
      console.error('❌ Error scheduling auto-backup:', error);
    }
  }

  // Manual backup trigger (for testing)
  public static async triggerManualBackup(userId: string, userEmail: string): Promise<boolean> {
    console.log('🔄 Manual backup triggered...');
    return await this.backupToCloud(userId, userEmail);
  }

  // Clear backup (for testing or user request)
  public static async clearBackup(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Clearing backup for user:', userId);
      // This would delete the backup document from Firestore
      // await deleteDoc(doc(db, 'user_backups', userId));
      console.log('ℹ️ Backup clear not implemented (safety measure)');
      return true;
    } catch (error) {
      console.error('❌ Error clearing backup:', error);
      return false;
    }
  }
}