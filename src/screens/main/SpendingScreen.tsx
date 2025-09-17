import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Card, Button, Input, CurrencyInput, DateInput } from '../../components/UI';
import { expenseStorage, budgetStorage } from '../../utils/storage';
import { formatINR, getNumericValue } from '../../utils/currency';
import type {
  Expense,
  BudgetCollection,
  ExpenseFormData,
  BudgetStatus,
  ExpenseCategory
} from '../../types';
import { EXPENSE_CATEGORIES } from '../../types';
import { TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CategorySelectionModal from './CategorySelectionModal';


const SpendingScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<BudgetCollection>({});
  const [showAddExpense, setShowAddExpense] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showSetBudget, setShowSetBudget] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExpenseFormData>({
    amount: '',
    category: 'Food & Dining',
    description: '',
    date: '',
  });
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetEditValue, setBudgetEditValue] = useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

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
    if (amount < 0) {
      Alert.alert('Error', 'Please enter a valid budget amount (0 or higher)');
      return;
    }

    try {
      if (amount === 0) {
        // Delete budget if set to 0
        await budgetStorage.delete(showSetBudget);
        Alert.alert('Success', 'Budget removed successfully!');
      } else {
        // Set/update budget
        await budgetStorage.set(showSetBudget, amount);
        Alert.alert('Success', 'Budget updated successfully!');
      }

      await loadData();
      setShowSetBudget(null);
      setBudgetAmount('');
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
    if (!budget) return { spent: 0, budget: 0, percentage: 0, status: 'good', remaining: 0 };

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
    const remaining = Math.max(0, budget.amount - spent);

    return { spent, budget: budget.amount, percentage, status, remaining };
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

  const startEditingExpense = (expense: Expense) => {
    setEditingExpense(expense.id);
    setEditForm({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || '',
      date: expense.date,
    });
  };

  const saveExpenseEdit = async (id: string) => {
    const amount = getNumericValue(editForm.amount);
    if (amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await expenseStorage.update(id, {
        amount,
        category: editForm.category,
        description: editForm.description,
        date: editForm.date,
      });
      await loadData();
      setEditingExpense(null);
      Alert.alert('Success', 'Expense updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update expense');
    }
  };

  const cancelExpenseEdit = () => {
    setEditingExpense(null);
    setEditForm({
      amount: '',
      category: 'Food & Dining',
      description: '',
      date: '',
    });
  };

  const deleteExpense = async (id: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseStorage.delete(id);
              await loadData();
              Alert.alert('Success', 'Expense deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          }
        }
      ]
    );
  };

  const startEditingBudget = (category: string, currentAmount: number) => {
    setEditingBudget(category);
    setBudgetEditValue(currentAmount.toString());
  };

  const saveBudgetEdit = async (category: string) => {
    const amount = getNumericValue(budgetEditValue);
    if (amount < 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      if (amount === 0) {
        // Delete budget if set to 0
        await budgetStorage.delete(category);
      } else {
        await budgetStorage.set(category, amount);
      }
      await loadData();
      setEditingBudget(null);
      setBudgetEditValue('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update budget');
    }
  };

  const cancelBudgetEdit = () => {
    setEditingBudget(null);
    setBudgetEditValue('');
  };

  const deleteBudget = async (category: string): Promise<void> => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for ${category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetStorage.delete(category);
              await loadData();
              Alert.alert('Success', 'Budget deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete budget');
            }
          }
        }
      ]
    );
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
          <>
            {Object.entries(budgets).map(([category, budget]) => {
              const status = calculateBudgetStatus(category);

              return (
                <View key={category} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.budgetCategory}>{category}</Text>
                    <View style={styles.budgetActions}>
                      <Text style={styles.budgetAmount}>
                        {formatINR(status.spent)} / {formatINR(status.budget)}
                      </Text>
                      <TouchableOpacity
                        style={styles.budgetEditButton}
                        onPress={() => {
                          setShowSetBudget(category);
                          setBudgetAmount(budget.amount.toString());
                        }}
                      >
                        <Ionicons name="create-outline" size={16} color="#2563eb" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.budgetDeleteButton}
                        onPress={() => deleteBudget(category)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        status.status === 'good' && styles.progressgood,
                        status.status === 'warning' && styles.progresswarning,
                        status.status === 'danger' && styles.progressdanger,
                        { width: `${Math.min(status.percentage, 100)}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.budgetFooter}>
                    <Text
                      style={[
                        styles.budgetPercentage,
                        status.status === 'good' && styles.textgood,
                        status.status === 'warning' && styles.textwarning,
                        status.status === 'danger' && styles.textdanger,
                      ]}
                    >
                      {Math.round(status.percentage)}% used
                    </Text>
                    <Text style={styles.budgetRemaining}>
                      {formatINR(Math.max(0, status.budget - status.spent))} remaining
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.noBudgetContainer}>
            <Ionicons name="wallet-outline" size={48} color="#cbd5e1" />
            <Text style={styles.noBudgetTitle}>No budgets set yet</Text>
            <Text style={styles.noBudgetText}>
              Track your spending by setting budgets for different categories
            </Text>
            <Button
              title="Create Your First Budget"
              onPress={() => setShowCategoryModal(true)}
              style={styles.createBudgetButton}
            />
          </View>
        )}

        {/* Quick Budget Setup */}
        {Object.keys(budgets).length > 0 && (
          <View style={styles.quickBudgetSection}>
            <Text style={styles.quickBudgetTitle}>Add More Budgets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickBudgetScroll}>
              {EXPENSE_CATEGORIES.filter(cat => !budgets[cat]).map(category => (
                <TouchableOpacity
                  key={category}
                  style={styles.quickBudgetButton}
                  onPress={() => setShowSetBudget(category)}
                >
                  <Text style={styles.quickBudgetButtonText}>+ {category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Set Budget Form */}
        {showSetBudget && (
          <View style={styles.setBudgetForm}>
            <Text style={styles.setBudgetTitle}>
              {budgets[showSetBudget] ? 'Edit' : 'Set'} Budget for {showSetBudget}
            </Text>
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
                onPress={() => {
                  setShowSetBudget(null);
                  setBudgetAmount('');
                }}
                style={styles.halfButton}
              />
              <Button
                title={budgets[showSetBudget] ? 'Update Budget' : 'Set Budget'}
                onPress={setBudgetForCategory}
                style={styles.halfButton}
              />
            </View>
            {budgets[showSetBudget] && (
              <Text style={styles.budgetHint}>
                💡 Tip: Set to 0 and save to remove this budget entirely
              </Text>
            )}
          </View>
        )}
      </Card>

      {/* Recent Expenses */}
      <Card>
        <Text style={styles.cardTitle}>📝 Recent Expenses</Text>
        {expenses.slice(0, 10).map(expense => (
          <View key={expense.id} style={styles.expenseItem}>
            {editingExpense === expense.id ? (
              // Edit Mode
              <View style={styles.editExpenseForm}>
                <CurrencyInput
                  label="Amount"
                  value={editForm.amount}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, amount: value }))}
                  placeholder="1,000"
                  currency="₹"
                  style={styles.editInput}
                />

                <View style={styles.categoryContainer}>
                  <Text style={styles.label}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {EXPENSE_CATEGORIES.map(category => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          editForm.category === category && styles.categoryChipActive
                        ]}
                        onPress={() => setEditForm(prev => ({ ...prev, category }))}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          editForm.category === category && styles.categoryChipTextActive
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Input
                  label="Description"
                  value={editForm.description}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, description: value }))}
                  placeholder="What did you buy?"
                  style={styles.editInput}
                />

                <DateInput
                  label="Date"
                  value={editForm.date}
                  onChangeDate={(value) => setEditForm(prev => ({ ...prev, date: value }))}
                  placeholder="Select date"
                  maximumDate={new Date()}
                />

                <View style={styles.editButtonRow}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={cancelExpenseEdit}
                    style={styles.editButton}
                  />
                  <Button
                    title="Save"
                    onPress={() => saveExpenseEdit(expense.id)}
                    style={styles.editButton}
                  />
                </View>
              </View>
            ) : (
              // Display Mode
              <View style={styles.expenseDisplay}>
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

                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>
                    {formatINR(expense.amount)}
                  </Text>
                  <View style={styles.expenseActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => startEditingExpense(expense)}
                    >
                      <Ionicons name="create-outline" size={16} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteExpense(expense.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}
        {expenses.length === 0 && (
          <Text style={styles.emptyText}>Add your first expense above!</Text>
        )}
      </Card>
      <CategorySelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelectCategory={(category) => setShowSetBudget(category)}
      />
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
  editExpenseForm: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  editInput: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  expenseDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseActions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
  },
  budgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetEditButton: {
    padding: 4,
    backgroundColor: '#e0f2fe',
    borderRadius: 4,
  },
  budgetDeleteButton: {
    padding: 4,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  budgetRemaining: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  noBudgetContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  noBudgetText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  firstBudgetButton: {
    paddingHorizontal: 24,
  },
  quickBudgetSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickBudgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  quickBudgetScroll: {
    marginBottom: 4,
  },
  quickBudgetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickBudgetButtonText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  budgetHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  noBudgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  createBudgetButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
});

export default SpendingScreen;