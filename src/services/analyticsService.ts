import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from './firebaseService';
import { 
  expenseStorage,
  budgetStorage,
  emergencyFundStorage,
  savingsGoalStorage
} from '../utils/storage';
import type { Expense, ExpenseCategory } from '../types';
import * as Crypto from 'expo-crypto';

// Anonymous analytics data structures
interface AnonymousUserProfile {
  anonymousId: string;
  demographicData: {
    ageGroup: '18-25' | '26-35' | '36-45' | '46-55' | '55+' | 'prefer_not_to_say';
    incomeRange: 'under_25k' | '25k-50k' | '50k-100k' | '100k-200k' | '200k+' | 'prefer_not_to_say';
    location: {
      country: string;
      state: string;
      // City omitted for privacy
    };
    familySize: number;
  };
  joinedAt: string;
  lastActiveAt: string;
}

interface SpendingPattern {
  anonymousId: string;
  month: string; // YYYY-MM format
  categoryTotals: {
    [category: string]: number; // Spending ranges, not exact amounts
  };
  totalSpentRange: number; // 1-5 scale
  transactionCount: number;
  averageTransactionRange: number; // 1-5 scale
  topSpendingDays: number[]; // Days of week (0-6)
  budgetAdherence: {
    [category: string]: number; // Percentage adherence (0-100)
  };
  timestamp: string;
}

interface SavingsBehavior {
  anonymousId: string;
  month: string;
  emergencyFundProgressRange: number; // 1-5 scale (0-20%, 20-40%, etc.)
  savingsGoalsCount: number;
  goalCompletionRate: number; // Percentage (0-100)
  averageGoalSizeRange: number; // 1-5 scale
  savingsFrequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  timestamp: string;
}

interface SecurityEvent {
  anonymousId: string;
  eventType: 'scam_detected' | 'scam_avoided' | 'fee_alert_viewed' | 'budget_alert_triggered';
  riskLevel: 'low' | 'medium' | 'high';
  category?: string; // For budget alerts
  timestamp: string;
}

interface AppUsageMetrics {
  anonymousId: string;
  date: string; // YYYY-MM-DD
  sessionDuration: number; // Minutes
  featuresUsed: string[];
  screenViews: {
    [screenName: string]: number;
  };
  timestamp: string;
}

export class AnalyticsService {
  private static anonymousId: string | null = null;
  private static sessionStartTime: number = Date.now();
  private static screenViews: { [screenName: string]: number } = {};
  private static featuresUsed: Set<string> = new Set();

  // Generate anonymous user ID (same user = same ID, but unlinkable to real identity)
  private static async generateAnonymousId(userEmail: string): Promise<string> {
    if (this.anonymousId) return this.anonymousId;

    // Create deterministic but anonymized ID
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${userEmail}_aivest_anonymous_salt`
    );
    
    this.anonymousId = hash.substring(0, 16);
    return this.anonymousId;
  }

  // Initialize analytics for a user
  public static async initializeAnalytics(
    userEmail: string,
    demographicData?: Partial<AnonymousUserProfile['demographicData']>
  ): Promise<void> {
    try {
      const anonymousId = await this.generateAnonymousId(userEmail);
      
      console.log('📊 Initializing anonymous analytics...');

      // Create anonymous user profile (if demographic data provided)
      if (demographicData) {
        const userProfile: AnonymousUserProfile = {
          anonymousId,
          demographicData: {
            ageGroup: demographicData.ageGroup || 'prefer_not_to_say',
            incomeRange: demographicData.incomeRange || 'prefer_not_to_say',
            location: {
              country: demographicData.location?.country || 'IN',
              state: demographicData.location?.state || 'Unknown'
            },
            familySize: demographicData.familySize || 1
          },
          joinedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'user_analytics', anonymousId), userProfile, { merge: true });
        console.log('✅ Anonymous user profile created');
      }

      // Initialize session tracking
      this.sessionStartTime = Date.now();
      this.screenViews = {};
      this.featuresUsed = new Set();

      console.log('✅ Analytics initialized for anonymous user:', anonymousId);

    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }
  }

  // Convert exact amounts to privacy-safe ranges
  private static categorizeAmount(amount: number): number {
    if (amount < 100) return 1;     // Micro (Under ₹100)
    if (amount < 1000) return 2;    // Small (₹100-1000)  
    if (amount < 5000) return 3;    // Medium (₹1000-5000)
    if (amount < 25000) return 4;   // Large (₹5000-25000)
    return 5;                       // Very Large (Above ₹25000)
  }

  // Convert progress percentages to ranges
  private static categorizeProgress(progress: number): number {
    if (progress < 20) return 1;    // Just Started
    if (progress < 40) return 2;    // Making Progress
    if (progress < 60) return 3;    // Halfway There
    if (progress < 80) return 4;    // Almost Complete
    return 5;                       // Goal Achieved
  }

  // Aggregate spending data (remove all PII)
  private static async aggregateSpendingData(): Promise<SpendingPattern | null> {
    try {
      if (!this.anonymousId) return null;

      const expenses = await expenseStorage.getAll();
      const budgets = await budgetStorage.getAll();
      
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const monthlyExpenses = expenses.filter(exp => 
        exp.date.startsWith(currentMonth)
      );

      if (monthlyExpenses.length === 0) return null;

      // Aggregate by category (amounts converted to ranges)
      const categoryTotals: { [category: string]: number } = {};
      let totalSpent = 0;
      const dayFrequency: { [key: number]: number } = {};

      monthlyExpenses.forEach(expense => {
        const category = expense.category || 'Other';
        const amountRange = this.categorizeAmount(expense.amount);
        
        categoryTotals[category] = (categoryTotals[category] || 0) + amountRange;
        totalSpent += expense.amount;

        // Track spending days
        const day = new Date(expense.date).getDay();
        dayFrequency[day] = (dayFrequency[day] || 0) + 1;
      });

      // Calculate budget adherence (percentage only)
      const budgetAdherence: { [category: string]: number } = {};
      Object.keys(categoryTotals).forEach(category => {
        const budget = budgets[category];
        if (budget) {
          const actualSpent = monthlyExpenses
            .filter(exp => exp.category === category)
            .reduce((sum, exp) => sum + exp.amount, 0);
          budgetAdherence[category] = Math.min(100, (actualSpent / budget.amount) * 100);
        }
      });

      // Get top 3 spending days
      const topSpendingDays = Object.entries(dayFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([day]) => parseInt(day));

      return {
        anonymousId: this.anonymousId,
        month: currentMonth,
        categoryTotals,
        totalSpentRange: this.categorizeAmount(totalSpent),
        transactionCount: monthlyExpenses.length,
        averageTransactionRange: this.categorizeAmount(totalSpent / monthlyExpenses.length),
        topSpendingDays,
        budgetAdherence,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error aggregating spending data:', error);
      return null;
    }
  }

  // Aggregate savings behavior data
  private static async aggregateSavingsBehavior(): Promise<SavingsBehavior | null> {
    try {
      if (!this.anonymousId) return null;

      const emergencyFund = await emergencyFundStorage.get();
      const savingsGoals = await savingsGoalStorage.getAll();
      
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Calculate emergency fund progress range
      const emergencyProgress = emergencyFund.target > 0 
        ? (emergencyFund.current / emergencyFund.target) * 100 
        : 0;

      // Calculate goal completion rate
      const completedGoals = savingsGoals.filter(goal => goal.current >= goal.target);
      const goalCompletionRate = savingsGoals.length > 0 
        ? (completedGoals.length / savingsGoals.length) * 100 
        : 0;

      // Calculate average goal size range
      const avgGoalSize = savingsGoals.length > 0
        ? savingsGoals.reduce((sum, goal) => sum + goal.target, 0) / savingsGoals.length
        : 0;

      return {
        anonymousId: this.anonymousId,
        month: currentMonth,
        emergencyFundProgressRange: this.categorizeProgress(emergencyProgress),
        savingsGoalsCount: savingsGoals.length,
        goalCompletionRate: Math.round(goalCompletionRate),
        averageGoalSizeRange: this.categorizeAmount(avgGoalSize),
        savingsFrequency: 'monthly', // This could be calculated from transaction patterns
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error aggregating savings data:', error);
      return null;
    }
  }

  // Sync spending patterns to Firebase
  public static async syncSpendingPatterns(): Promise<boolean> {
    try {
      const spendingData = await this.aggregateSpendingData();
      if (!spendingData) return false;

      await setDoc(
        doc(db, 'spending_patterns', `${spendingData.anonymousId}_${spendingData.month}`),
        spendingData
      );

      console.log('✅ Spending patterns synced');
      return true;

    } catch (error) {
      console.error('❌ Error syncing spending patterns:', error);
      return false;
    }
  }

  // Sync savings behavior to Firebase
  public static async syncSavingsBehavior(): Promise<boolean> {
    try {
      const savingsData = await this.aggregateSavingsBehavior();
      if (!savingsData) return false;

      await setDoc(
        doc(db, 'savings_behavior', `${savingsData.anonymousId}_${savingsData.month}`),
        savingsData
      );

      console.log('✅ Savings behavior synced');
      return true;

    } catch (error) {
      console.error('❌ Error syncing savings behavior:', error);
      return false;
    }
  }

  // Log security event
  public static async logSecurityEvent(
    eventType: SecurityEvent['eventType'],
    riskLevel: SecurityEvent['riskLevel'],
    category?: string
  ): Promise<void> {
    try {
      if (!this.anonymousId) return;

      const securityEvent: SecurityEvent = {
        anonymousId: this.anonymousId,
        eventType,
        riskLevel,
        category,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'security_events'), securityEvent);
      console.log('🛡️ Security event logged:', eventType);

    } catch (error) {
      console.error('❌ Error logging security event:', error);
    }
  }

  // Track screen view
  public static trackScreenView(screenName: string): void {
    this.screenViews[screenName] = (this.screenViews[screenName] || 0) + 1;
  }

  // Track feature usage
  public static trackFeatureUsage(featureName: string): void {
    this.featuresUsed.add(featureName);
  }

  // Sync app usage metrics
  public static async syncAppUsage(): Promise<boolean> {
    try {
      if (!this.anonymousId) return false;

      const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 60000); // minutes
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const usageMetrics: AppUsageMetrics = {
        anonymousId: this.anonymousId,
        date: today,
        sessionDuration,
        featuresUsed: Array.from(this.featuresUsed),
        screenViews: { ...this.screenViews },
        timestamp: new Date().toISOString()
      };

      await setDoc(
        doc(db, 'app_usage', `${this.anonymousId}_${today}`),
        usageMetrics,
        { merge: true }
      );

      console.log('📱 App usage metrics synced');
      return true;

    } catch (error) {
      console.error('❌ Error syncing app usage:', error);
      return false;
    }
  }

  // Auto-sync all analytics data
  public static async syncAllAnalytics(): Promise<void> {
    try {
      console.log('📊 Syncing all anonymous analytics...');

      await Promise.all([
        this.syncSpendingPatterns(),
        this.syncSavingsBehavior(),
        this.syncAppUsage()
      ]);

      console.log('✅ All analytics synced successfully');

    } catch (error) {
      console.error('❌ Error syncing analytics:', error);
    }
  }

  // Schedule periodic analytics sync
  private static syncInterval: NodeJS.Timeout | null = null;

  public static startPeriodicSync(): void {
    // Sync every 15 minutes
    this.syncInterval = setInterval(async () => {
      console.log('🕐 Periodic analytics sync...');
      await this.syncAllAnalytics();
    }, 15 * 60 * 1000); // 15 minutes
  }

  public static stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Privacy-safe insights (what we can show back to users)
  public static async getPersonalizedInsights(): Promise<any> {
    try {
      if (!this.anonymousId) return null;

      // This would typically call a server-side ML API
      // For now, return basic insights based on local data
      const expenses = await expenseStorage.getAll();
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));

      if (monthlyExpenses.length === 0) return null;

      // Calculate simple insights
      const topCategory = monthlyExpenses
        .reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {} as { [key: string]: number });

      const topSpendingCategory = Object.entries(topCategory)
        .sort(([,a], [,b]) => b - a)[0];

      return {
        topSpendingCategory: topSpendingCategory[0],
        monthlyTransactions: monthlyExpenses.length,
        insight: `Your highest spending this month is in ${topSpendingCategory[0]}. Consider setting a budget to track this category better.`,
        generated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting insights:', error);
      return null;
    }
  }
}