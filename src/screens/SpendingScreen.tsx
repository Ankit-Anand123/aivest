import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Card, Button, Input, CurrencyInput, DateInput } from '../components/UI';
import { expenseStorage, budgetStorage } from '../utils/storage';
import { formatINR, getNumericValue } from '../utils/currency';
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
  const [showSetBudget, setShowSetBudget] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  
  // New expense form state
  const [newExpense, setNewExpense] = useState<ExpenseFormData>({
    amount: '',
    category: 'Food & Dining',
    description: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
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
    const amount = getNumericValue(newExpense.amount);
    
    if (!newExpense.amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!newExpense.date) {
      Alert.alert('Error', 'Please select a date');
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

  const setBudgetForCategory = async (): Promise<void> => {
    if (!showSetBudget) return;
    
    const amount = getNumericValue(budgetAmount);
    if (amount <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      await budgetStorage.set(showSetBudget, amount);
      await loadData();
      setShowSetBudget(null);
      setBudgetAmount('');
      Alert.alert('Success', 'Budget updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to set budget');
    }
  };

  const checkBudgetAlert = (category: ExpenseCategory, amount: number): void => {
    const budget = budgets[category];
    if (!budget) return;

    // Calculate total spent in category this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return exp.category === category && 
             expDate >= startOfMonth && 
             expDate <= now;
    });

    const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0) + amount;
    const percentage = (totalSpent / budget.amount) * 100;

    if (percentage >= 80) {
      const message = percentage >= 100 
        ? `⚠️ Budget exceeded! You've spent ${formatINR(totalSpent)} out of ${formatINR(budget.amount)} budget for ${category}.`
        : `⚠️ Budget alert! You've used ${Math.round(percentage)}% of your ${category} budget (${formatINR(totalSpent)}/${formatINR(budget.amount)}).`;
      
      Alert.alert('Budget Alert', message);
    }
  };

  const updateNewExpense = (field: keyof ExpenseFormData) => (value: string) => {
    setNewExpense(prev => ({ ...prev, [field]: value }));
  };

  const selectCategory = (category: ExpenseCategory) => {
    setNewExpense(prev => ({ ...prev, category }));
  };

  const calculateBudgetStatus = (category: string): BudgetStatus => {
    const budget = budgets[category];
    if (!budget) return { spent: 0, budget: 0, percentage: 0, status: 'good' };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return exp.category === category && 
             expDate >= startOfMonth && 
             expDate <= now;
    });

    const spent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const percentage = (spent / budget.amount) * 100;
    const status = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'good';

    return { spent, budget: budget.amount, percentage, status };
  };

  const calculateMonthlyTotal = (): number => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= startOfMonth && expDate <= now;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Total Spent This Month */}
      <Card>
        <Text style={styles.cardTitle}>💰 This Month</Text>
        <Text style={styles.totalAmount}>
          {formatINR(calculateMonthlyTotal())}
        </Text>
        <Text style={styles.subtitle}>Total Expenses</Text>
      </Card>

      {/* Add Expense Form */}
      <Card>
        <Text style={styles.cardTitle}>✏️ Add Expense</Text>
        {!showAddExpense ? (
          <Button 
            title="+ Add New Expense" 
            onPress={() => setShowAddExpense(true)}
          />
        ) : (
          <View>
            <CurrencyInput
              label="Amount"
              value={newExpense.amount}
              onChangeText={updateNewExpense('amount')}
              placeholder="1,000"
              currency="₹"
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

            <DateInput
              label="Date"
              value={newExpense.date}
              onChangeDate={updateNewExpense('date')}
              placeholder="Select date"
              maximumDate={new Date()} // Can't select future dates for expenses
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
        <Text style={styles.cardTitle}>📊 Budget Status</Text>
        {Object.keys(budgets).length > 0 ? (
          Object.entries(budgets).map(([category, budget]) => {
            const status = calculateBudgetStatus(category);
            return (
              <View key={category} style={styles.budgetItem}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetCategory}>{category}</Text>
                  <Text style={styles.budgetAmount}>
                    {formatINR(status.spent)} / {formatINR(status.budget)}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      styles[`progress${status.status}` as keyof typeof styles],
                      { width: `${Math.min(status.percentage, 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={[
                  styles.budgetPercentage,
                  styles[`text${status.status}` as keyof typeof styles]
                ]}>
                  {Math.round(status.percentage)}% used
                </Text>
              </View>
            );
          })
        ) : (
          <View>
            <Text style={styles.emptyText}>No budgets set yet.</Text>
            <Button
              title="+ Set Your First Budget"
              onPress={() => {
                setShowSetBudget(EXPENSE_CATEGORIES[0]);
                setBudgetAmount('');
              }}
              style={styles.setBudgetButton}
            />
          </View>
        )}

        {showSetBudget && (
          <View style={styles.setBudgetForm}>
            <Text style={styles.setBudgetTitle}>Set Budget for {showSetBudget}</Text>
            <CurrencyInput
              label="Monthly Budget Amount"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              placeholder="5,000"
              currency="₹"
            />
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowSetBudget(null)}
                style={styles.halfButton}
              />
              <Button
                title="Set Budget"
                onPress={setBudgetForCategory}
                style={styles.halfButton}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Recent Expenses */}
      <Card>
        <Text style={styles.cardTitle}>📝 Recent Expenses</Text>
        {expenses.slice(0, 10).map(expense => (
          <View key={expense.id} style={styles.expenseItem}>
            <View style={styles.expenseDetails}>
              <Text style={styles.expenseCategory}>{expense.category}</Text>
              {expense.description && (
                <Text style={styles.expenseDescription}>{expense.description}</Text>
              )}
              <Text style={styles.expenseDate}>
                {new Date(expense.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <Text style={styles.expenseAmount}>
              {formatINR(expense.amount)}
            </Text>
          </View>
        ))}
        {expenses.length === 0 && (
          <Text style={styles.emptyText}>Add your first expense above!</Text>
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
  setBudgetButton: {
    marginTop: 12,
  },
  setBudgetForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  setBudgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
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