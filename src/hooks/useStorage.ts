// src/hooks/useStorage.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  expenseStorage, 
  budgetStorage, 
  emergencyFundStorage, 
  savingsGoalStorage,
  scamAlertStorage 
} from '../utils/storage';
import type { 
  Expense, 
  BudgetCollection, 
  EmergencyFund, 
  SavingsGoal, 
  ScamAlert 
} from '../types';

// Generic storage hook
export function useStorageState<T>(
  initialValue: T,
  loader: () => Promise<T>
): [T, (value: T) => void, boolean, () => Promise<void>] {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await loader();
      setData(result);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [loader]);

  const updateData = useCallback((newData: T) => {
    setData(newData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return [data, updateData, loading, loadData];
}

// Specific hooks for each data type
export function useExpenses() {
  return useStorageState<Expense[]>([], expenseStorage.getAll);
}

export function useBudgets() {
  return useStorageState<BudgetCollection>({}, budgetStorage.getAll);
}

export function useEmergencyFund() {
  return useStorageState<EmergencyFund>(
    { target: 0, current: 0, updatedAt: null },
    emergencyFundStorage.get
  );
}

export function useSavingsGoals() {
  return useStorageState<SavingsGoal[]>([], savingsGoalStorage.getAll);
}

export function useScamAlerts() {
  return useStorageState<ScamAlert[]>([], scamAlertStorage.getAll);
}

// Combined hook for all financial data
export function useFinancialData() {
  const [expenses, setExpenses, expensesLoading, reloadExpenses] = useExpenses();
  const [budgets, setBudgets, budgetsLoading, reloadBudgets] = useBudgets();
  const [emergencyFund, setEmergencyFund, emergencyLoading, reloadEmergency] = useEmergencyFund();
  const [savingsGoals, setSavingsGoals, goalsLoading, reloadGoals] = useSavingsGoals();

  const loading = expensesLoading || budgetsLoading || emergencyLoading || goalsLoading;

  const reloadAll = useCallback(async () => {
    await Promise.all([
      reloadExpenses(),
      reloadBudgets(),
      reloadEmergency(),
      reloadGoals()
    ]);
  }, [reloadExpenses, reloadBudgets, reloadEmergency, reloadGoals]);

  // Computed values
  const totalMonthlySpending = useCallback(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses
      .filter(exp => new Date(exp.date) >= startOfMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const monthlyTransactionCount = useCallback(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses.filter(exp => new Date(exp.date) >= startOfMonth).length;
  }, [expenses]);

  const emergencyFundProgress = useCallback(() => {
    if (emergencyFund.target === 0) return 0;
    return Math.min((emergencyFund.current / emergencyFund.target) * 100, 100);
  }, [emergencyFund]);

  const completedGoalsCount = useCallback(() => {
    return savingsGoals.filter(goal => goal.current >= goal.target).length;
  }, [savingsGoals]);

  return {
    // Data
    expenses,
    budgets,
    emergencyFund,
    savingsGoals,
    
    // Setters
    setExpenses,
    setBudgets,
    setEmergencyFund,
    setSavingsGoals,
    
    // Loading states
    loading,
    expensesLoading,
    budgetsLoading,
    emergencyLoading,
    goalsLoading,
    
    // Reload functions
    reloadAll,
    reloadExpenses,
    reloadBudgets,
    reloadEmergency,
    reloadGoals,
    
    // Computed values
    totalMonthlySpending: totalMonthlySpending(),
    monthlyTransactionCount: monthlyTransactionCount(),
    emergencyFundProgress: emergencyFundProgress(),
    completedGoalsCount: completedGoalsCount(),
  };
}

// Hook for managing form state with validation
export function useFormState<T extends Record<string, any>>(
  initialState: T,
  validator?: (state: T) => Record<keyof T, string | undefined>
) {
  const [state, setState] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<keyof T, string | undefined>>({} as Record<keyof T, string | undefined>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const updateField = useCallback((field: keyof T) => (value: T[keyof T]) => {
    setState(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (validator) {
      const newErrors = validator({ ...state, [field]: value });
      setErrors(newErrors);
    }
  }, [state, validator]);

  const resetForm = useCallback(() => {
    setState(initialState);
    setErrors({} as Record<keyof T, string | undefined>);
    setTouched({} as Record<keyof T, boolean>);
  }, [initialState]);

  const isValid = useCallback(() => {
    if (!validator) return true;
    const currentErrors = validator(state);
    return Object.values(currentErrors).every(error => !error);
  }, [state, validator]);

  return {
    state,
    errors,
    touched,
    updateField,
    resetForm,
    isValid: isValid(),
    setState,
  };
}