// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { 
  Expense, 
  BudgetCollection, 
  Budget, 
  EmergencyFund, 
  SavingsGoal, 
  ScamAlert,
  StorageKeys,
  ExpenseCategory,
  StorageResponse
} from '../types';

// Generic storage functions
export const storeData = async <T>(key: StorageKeys, value: T): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error('Error storing data:', error);
    return false;
  }
};

export const getData = async <T>(key: StorageKeys, defaultValue: T): Promise<T> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (error) {
    console.error('Error getting data:', error);
    return defaultValue;
  }
};

export const removeData = async (key: StorageKeys): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing data:', error);
    return false;
  }
};

export const clearAllData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};

// Expense storage functions
export const expenseStorage = {
  // Get all expenses
  getAll: async (): Promise<Expense[]> => {
    const expenses = await getData<Expense[]>(StorageKeys.EXPENSES, []);
    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Add new expense
  add: async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
    const expenses = await expenseStorage.getAll();
    const newExpense: Expense = {
      id: Date.now().toString(),
      ...expense,
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    await storeData(StorageKeys.EXPENSES, expenses);
    return newExpense;
  },

  // Update expense
  update: async (id: string, updatedExpense: Partial<Omit<Expense, 'id' | 'createdAt'>>): Promise<Expense | null> => {
    const expenses = await expenseStorage.getAll();
    const index = expenses.findIndex(exp => exp.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updatedExpense };
      await storeData(StorageKeys.EXPENSES, expenses);
      return expenses[index];
    }
    return null;
  },

  // Delete expense
  delete: async (id: string): Promise<boolean> => {
    const expenses = await expenseStorage.getAll();
    const filteredExpenses = expenses.filter(exp => exp.id !== id);
    await storeData(StorageKeys.EXPENSES, filteredExpenses);
    return true;
  },

  // Get expenses by category
  getByCategory: async (category: ExpenseCategory): Promise<Expense[]> => {
    const expenses = await expenseStorage.getAll();
    return expenses.filter(exp => exp.category === category);
  },

  // Get expenses by date range
  getByDateRange: async (startDate: Date, endDate: Date): Promise<Expense[]> => {
    const expenses = await expenseStorage.getAll();
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= startDate && expDate <= endDate;
    });
  },
};

// Budget storage functions
export const budgetStorage = {
  // Get all budgets
  getAll: async (): Promise<BudgetCollection> => {
    return await getData<BudgetCollection>(StorageKeys.BUDGETS, {});
  },

  // Set budget for category
  set: async (category: string, amount: number): Promise<Budget> => {
    const budgets = await budgetStorage.getAll();
    const newBudget: Budget = {
      amount: parseFloat(amount.toString()),
      updatedAt: new Date().toISOString(),
    };
    budgets[category] = newBudget;
    await storeData(StorageKeys.BUDGETS, budgets);
    return newBudget;
  },

  // Get budget for category
  get: async (category: string): Promise<Budget | null> => {
    const budgets = await budgetStorage.getAll();
    return budgets[category] || null;
  },

  // Delete budget
  delete: async (category: string): Promise<boolean> => {
    const budgets = await budgetStorage.getAll();
    delete budgets[category];
    await storeData(StorageKeys.BUDGETS, budgets);
    return true;
  },
};

// Emergency fund storage functions
export const emergencyFundStorage = {
  // Get emergency fund data
  get: async (): Promise<EmergencyFund> => {
    return await getData<EmergencyFund>(StorageKeys.EMERGENCY_FUND, {
      target: 0,
      current: 0,
      updatedAt: null,
    });
  },

  // Update emergency fund
  update: async (data: Partial<Omit<EmergencyFund, 'updatedAt'>>): Promise<EmergencyFund> => {
    const current = await emergencyFundStorage.get();
    const updated: EmergencyFund = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await storeData(StorageKeys.EMERGENCY_FUND, updated);
    return updated;
  },
};

// Savings goal storage functions
export const savingsGoalStorage = {
  // Get all savings goals
  getAll: async (): Promise<SavingsGoal[]> => {
    return await getData<SavingsGoal[]>(StorageKeys.SAVINGS_GOALS, []);
  },

  // Add new savings goal
  add: async (goal: Omit<SavingsGoal, 'id' | 'createdAt'>): Promise<SavingsGoal> => {
    const goals = await savingsGoalStorage.getAll();
    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      ...goal,
      createdAt: new Date().toISOString(),
    };
    goals.push(newGoal);
    await storeData(StorageKeys.SAVINGS_GOALS, goals);
    return newGoal;
  },

  // Update savings goal
  update: async (id: string, updatedGoal: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>): Promise<SavingsGoal | null> => {
    const goals = await savingsGoalStorage.getAll();
    const index = goals.findIndex(goal => goal.id === id);
    if (index !== -1) {
      goals[index] = { ...goals[index], ...updatedGoal };
      await storeData(StorageKeys.SAVINGS_GOALS, goals);
      return goals[index];
    }
    return null;
  },

  // Delete savings goal
  delete: async (id: string): Promise<boolean> => {
    const goals = await savingsGoalStorage.getAll();
    const filteredGoals = goals.filter(goal => goal.id !== id);
    await storeData(StorageKeys.SAVINGS_GOALS, filteredGoals);
    return true;
  },
};

// Scam alerts storage functions
export const scamAlertStorage = {
  // Get all scam alerts
  getAll: async (): Promise<ScamAlert[]> => {
    return await getData<ScamAlert[]>(StorageKeys.SCAM_ALERTS, []);
  },

  // Add new scam alert
  add: async (alert: Omit<ScamAlert, 'id' | 'timestamp'>): Promise<ScamAlert> => {
    const alerts = await scamAlertStorage.getAll();
    const newAlert: ScamAlert = {
      id: Date.now().toString(),
      ...alert,
      timestamp: new Date().toISOString(),
    };
    alerts.unshift(newAlert);
    
    // Keep only last 10 alerts
    const limitedAlerts = alerts.slice(0, 10);
    await storeData(StorageKeys.SCAM_ALERTS, limitedAlerts);
    return newAlert;
  },

  // Clear all alerts
  clear: async (): Promise<boolean> => {
    await storeData(StorageKeys.SCAM_ALERTS, []);
    return true;
  },
};