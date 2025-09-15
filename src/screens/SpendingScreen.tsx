// src/screens/SpendingScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Card, Button, Input } from '../components/UI';
import { expenseStorage, budgetStorage } from '../utils/storage';
import type { 
  Expense, 
  BudgetCollection, 
  ExpenseFormData, 
  BudgetStatus, 
  ExpenseCategory 
} from '../types';
import { EXPENSE_CATEGORIES } from '../types';

const SpendingScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<BudgetCollection>({});
  const [showAddExpense, setShowAddExpense] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // New expense form state
  const [newExpense, setNewExpense] = useState<ExpenseFormData>({
    amount: '',
    category: 'Food & Dining',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      const [expenseData, budgetData] = await Promise.all([
        expenseStorage.getAll(),
        budgetStorage.getAll(),
      ]);
      setExpenses(expenseData);
      setBudgets(budgetData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const addExpense = async (): Promise<void> => {
    const amount = parseFloat(newExpense.amount);
    
    if (!newExpense.amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const expense = await expenseStorage.add({
        amount,
        category: newExpense.category,
        description: newExpense.description,
        date: newExpense.date,
      });
      
      setExpenses(prev => [expense, ...prev]);
      setNewExpense({
        amount: '',
        category: 'Food & Dining',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAddExpense(false);
      
      // Check budget alert
      checkBudgetAlert(expense.category, expense.amount);
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const checkBudgetAlert = (category: ExpenseCategory, amount: number): void => {
    const budget = budgets[category];
    if (!budget) return;

    // Calculate total spent in category this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyExpenses = expenses.filter(exp => 
      exp.category === category && 
      new Date(exp.date) >= startOfMonth
    );
    
    const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0) + amount;
    const percentage = (totalSpent / budget.amount) * 100;

    if (percentage >= 90) {
      Alert.alert(
        '🚨 Budget Alert',
        `You've spent ${percentage.toFixed(1)}% of your ${category} budget this month!`
      );
    } else if (percentage >= 70) {
      Alert.alert(
        '⚠️ Budget Warning',
        `You've spent ${percentage.toFixed(1)}% of your ${category} budget this month.`
      );
    }
  };

  const getBudgetStatus = (category: string): BudgetStatus | null => {
    const budget = budgets[category];
    if (!budget) return null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyExpenses = expenses.filter(exp => 
      exp.category === category && 
      new Date(exp.date) >= startOfMonth
    );
    
    const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const percentage = (totalSpent / budget.amount) * 100;

    return {
      spent: totalSpent,
      budget: budget.amount,
      percentage: Math.min(percentage, 100),
      status: percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'good'
    };
  };

  const getRecentExpenses = (): Expense[] => {
    return expenses.slice(0, 5);
  };

  const getTotalThisMonth = (): number => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses
      .filter(exp => new Date(exp.date) >= startOfMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getMonthlyTransactionCount = (): number => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses.filter(exp => new Date(exp.date) >= startOfMonth).length;
  };

  const updateNewExpense = (field: keyof ExpenseFormData) => (value: string): void => {
    setNewExpense(prev => ({ ...prev, [field]: value }));
  };

  const selectCategory = (category: ExpenseCategory): void => {
    setNewExpense(prev => ({ ...prev, category }));
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Monthly Summary */}
      <Card>
        <Text style={styles.cardTitle}>This Month's Spending</Text>
        <Text style={styles.totalAmount}>₹{getTotalThisMonth().toLocaleString('en-IN')}</Text>
        <Text style={styles.subtitle}>
          {getMonthlyTransactionCount()} transactions
        </Text>
      </Card>

      {/* Quick Add Expense */}
      <Card>
        <Text style={styles.cardTitle}>Quick Add Expense</Text>
        {!showAddExpense ? (
          <Button 
            title="+ Add New Expense" 
            onPress={() => setShowAddExpense(true)}
          />
        ) : (
          <View>
            <Input
              label="Amount (₹)"
              value={newExpense.amount}
              onChangeText={updateNewExpense('amount')}
              placeholder="0"
              keyboardType="numeric"
            />
            
            <View style={styles.categoryContainer}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {EXPENSE_CATEGORIES.map(category => (
                  <Button
                    key={category}
                    title={category}
                    variant={newExpense.category === category ? 'primary' : 'secondary'}
                    onPress={() => selectCategory(category)}
                    style={styles.categoryButton}
                  />
                ))}
              </ScrollView>
            </View>

            <Input
              label="Description (Optional)"
              value={newExpense.description}
              onChangeText={updateNewExpense('description')}
              placeholder="What did you buy?"
            />

            <View style={styles.buttonRow}>
              <Button 
                title="Cancel" 
                variant="secondary"
                onPress={() => setShowAddExpense(false)}
                style={styles.halfButton}
              />
              <Button 
                title="Add Expense" 
                onPress={addExpense}
                style={styles.halfButton}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Budget Status */}
      <Card>
        <Text style={styles.cardTitle}>Budget Status</Text>
        {Object.keys(budgets).length > 0 ? (
          Object.entries(budgets).map(([category, budget]) => {
            const status = getBudgetStatus(category);
            if (!status) return null;
            
            return (
              <View key={category} style={styles.budgetItem}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetCategory}>{category}</Text>
                  <Text style={styles.budgetAmount}>
                    ₹{status.spent.toLocaleString('en-IN')} / ₹{status.budget.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${status.percentage}%` },
                      styles[`progress${status.status}`]
                    ]} 
                  />
                </View>
                <Text style={[styles.budgetPercentage, styles[`text${status.status}`]]}>
                  {status.percentage.toFixed(1)}% used
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No budgets set. Set budgets to track your spending!</Text>
        )}
      </Card>

      {/* Recent Expenses */}
      <Card>
        <Text style={styles.cardTitle}>Recent Expenses</Text>
        {getRecentExpenses().length > 0 ? (
          getRecentExpenses().map(expense => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseDetails}>
                <Text style={styles.expenseCategory}>{expense.category}</Text>
                <Text style={styles.expenseDescription}>
                  {expense.description || 'No description'}
                </Text>
                <Text style={styles.expenseDate}>
                  {new Date(expense.date).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>₹{expense.amount.toLocaleString('en-IN')}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No expenses yet. Add your first expense above!</Text>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  categoryContainer: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  categoryButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  halfButton: {
    flex: 0.48,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  budgetAmount: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressgood: {
    backgroundColor: '#10b981',
  },
  progresswarning: {
    backgroundColor: '#f59e0b',
  },
  progressdanger: {
    backgroundColor: '#ef4444',
  },
  budgetPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  textgood: {
    color: '#10b981',
  },
  textwarning: {
    color: '#f59e0b',
  },
  textdanger: {
    color: '#ef4444',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  expenseDetails: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  expenseDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SpendingScreen;