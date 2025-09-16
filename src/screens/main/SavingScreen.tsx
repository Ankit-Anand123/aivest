// src/screens/SavingScreen.tsx
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
import { emergencyFundStorage, savingsGoalStorage } from '../../utils/storage';
import { formatINR, getNumericValue } from '../../utils/currency';
import type { 
  EmergencyFund, 
  SavingsGoal, 
  EmergencyFundFormData, 
  SavingsGoalFormData 
} from '../../types';

const SavingScreen: React.FC = () => {
  const [emergencyFund, setEmergencyFund] = useState<EmergencyFund>({
    target: 0,
    current: 0,
    updatedAt: null,
  });
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showAddGoal, setShowAddGoal] = useState<boolean>(false);
  const [showEditEmergency, setShowEditEmergency] = useState<boolean>(false);

  // Emergency fund edit state
  const [emergencyEdit, setEmergencyEdit] = useState<EmergencyFundFormData>({
    target: '',
    current: '',
  });

  // New goal state
  const [newGoal, setNewGoal] = useState<SavingsGoalFormData>({
    name: '',
    target: '',
    current: '',
    targetDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      const [emergencyData, goalsData] = await Promise.all([
        emergencyFundStorage.get(),
        savingsGoalStorage.getAll(),
      ]);
      setEmergencyFund(emergencyData);
      setSavingsGoals(goalsData);
    } catch (error) {
      console.error('Error loading savings data:', error);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateEmergencyFund = async (): Promise<void> => {
    const target = getNumericValue(emergencyEdit.target);
    const current = getNumericValue(emergencyEdit.current);

    if (isNaN(target) || target < 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    if (isNaN(current) || current < 0) {
      Alert.alert('Error', 'Please enter a valid current amount');
      return;
    }

    try {
      const updated = await emergencyFundStorage.update({
        target,
        current,
      });
      setEmergencyFund(updated);
      setShowEditEmergency(false);
      Alert.alert('Success', 'Emergency fund updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update emergency fund');
    }
  };

  const addSavingsGoal = async (): Promise<void> => {
    const target = getNumericValue(newGoal.target);
    const current = getNumericValue(newGoal.current);

    if (!newGoal.name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    if (isNaN(current) || current < 0) {
      Alert.alert('Error', 'Please enter a valid current amount');
      return;
    }

    // Validate target date if provided
    if (newGoal.targetDate) {
      const targetDate = new Date(newGoal.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare only dates
      
      if (targetDate < today) {
        Alert.alert('Error', 'Target date cannot be in the past');
        return;
      }
    }

    try {
      const goal = await savingsGoalStorage.add({
        name: newGoal.name,
        target,
        current,
        targetDate: newGoal.targetDate || undefined,
      });

      setSavingsGoals(prev => [...prev, goal]);
      setNewGoal({
        name: '',
        target: '',
        current: '',
        targetDate: '',
      });
      setShowAddGoal(false);
      Alert.alert('Success', 'Savings goal added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add savings goal');
    }
  };

  const updateGoalProgress = async (goalId: string, newAmount: number): Promise<void> => {
    try {
      await savingsGoalStorage.updateProgress(goalId, newAmount);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal progress');
    }
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this savings goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await savingsGoalStorage.delete(goalId);
              setSavingsGoals(prev => prev.filter(goal => goal.id !== goalId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const updateNewGoal = (field: keyof SavingsGoalFormData) => (value: string) => {
    setNewGoal(prev => ({ ...prev, [field]: value }));
  };

  const updateEmergencyEdit = (field: keyof EmergencyFundFormData) => (value: string) => {
    setEmergencyEdit(prev => ({ ...prev, [field]: value }));
  };

  const getEmergencyFundProgress = (): number => {
    if (emergencyFund.target === 0) return 0;
    return Math.min((emergencyFund.current / emergencyFund.target) * 100, 100);
  };

  const getSavingsGoalProgress = (goal: SavingsGoal): number => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const getDaysToTarget = (targetDate?: string): number | null => {
    if (!targetDate) return null;
    
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const handleEditEmergency = (): void => {
    setEmergencyEdit({
      target: emergencyFund.target.toString(),
      current: emergencyFund.current.toString(),
    });
    setShowEditEmergency(true);
  };

  const promptUpdateGoal = (goal: SavingsGoal): void => {
    Alert.prompt(
      'Update Progress',
      `Enter new amount for ${goal.name}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: (value) => {
            if (value) {
              const amount = getNumericValue(value);
              if (!isNaN(amount) && amount >= 0) {
                updateGoalProgress(goal.id, amount);
              } else {
                Alert.alert('Error', 'Please enter a valid amount');
              }
            }
          },
        },
      ],
      'plain-text',
      formatINR(goal.current)
    );
  };

  // Get minimum date for target date (tomorrow)
  const getMinimumTargetDate = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Emergency Fund */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🚨 Emergency Fund</Text>
          <Button
            title="Edit"
            variant="secondary"
            onPress={handleEditEmergency}
            style={styles.editButton}
          />
        </View>
        
        {!showEditEmergency ? (
          <View>
            <Text style={styles.fundAmount}>
              {formatINR(emergencyFund.current)}
            </Text>
            <Text style={styles.fundTarget}>
              Goal: {formatINR(emergencyFund.target)}
            </Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    getEmergencyFundProgress() >= 100 
                      ? styles.progressComplete 
                      : styles.progressPartial,
                    { width: `${getEmergencyFundProgress()}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(getEmergencyFundProgress())}% Complete
              </Text>
            </View>
            
            <Text style={styles.fundAdvice}>
              {emergencyFund.target === 0 
                ? "Set up your emergency fund target for financial security!"
                : getEmergencyFundProgress() >= 100
                ? "Great job! Your emergency fund is fully funded."
                : "Keep building your emergency fund for unexpected expenses."
              }
            </Text>
          </View>
        ) : (
          <View>
            <CurrencyInput
              label="Target Amount"
              value={emergencyEdit.target}
              onChangeText={updateEmergencyEdit('target')}
              placeholder="1,00,000"
              currency="₹"
            />
            
            <CurrencyInput
              label="Current Amount"
              value={emergencyEdit.current}
              onChangeText={updateEmergencyEdit('current')}
              placeholder="0"
              currency="₹"
            />

            <View style={styles.buttonRow}>
              <Button 
                title="Cancel" 
                variant="secondary"
                onPress={() => setShowEditEmergency(false)}
                style={styles.halfButton}
              />
              <Button 
                title="Update" 
                onPress={updateEmergencyFund}
                style={styles.halfButton}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Savings Goals */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🎯 Savings Goals</Text>
          <Button
            title="+ Add Goal"
            variant="secondary"
            onPress={() => setShowAddGoal(true)}
            style={styles.editButton}
          />
        </View>

        {showAddGoal && (
          <View style={styles.addGoalForm}>
            <Input
              label="Goal Name"
              value={newGoal.name}
              onChangeText={updateNewGoal('name')}
              placeholder="Vacation, Car, House..."
            />
            
            <CurrencyInput
              label="Target Amount"
              value={newGoal.target}
              onChangeText={updateNewGoal('target')}
              placeholder="50,000"
              currency="₹"
            />
            
            <CurrencyInput
              label="Current Amount"
              value={newGoal.current}
              onChangeText={updateNewGoal('current')}
              placeholder="0"
              currency="₹"
            />
            
            <DateInput
              label="Target Date (Optional)"
              value={newGoal.targetDate}
              onChangeDate={updateNewGoal('targetDate')}
              placeholder="Select target date"
              minimumDate={getMinimumTargetDate()}
            />

            <View style={styles.buttonRow}>
              <Button 
                title="Cancel" 
                variant="secondary"
                onPress={() => setShowAddGoal(false)}
                style={styles.halfButton}
              />
              <Button 
                title="Add Goal" 
                onPress={addSavingsGoal}
                style={styles.halfButton}
              />
            </View>
          </View>
        )}

        {savingsGoals.length > 0 ? (
          <View>
            {savingsGoals.map(goal => {
              const progress = getSavingsGoalProgress(goal);
              const daysToTarget = getDaysToTarget(goal.targetDate);
              
              return (
                <View key={goal.id} style={styles.goalItem}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Button
                      title="×"
                      variant="danger"
                      onPress={() => deleteGoal(goal.id)}
                      style={styles.deleteButton}
                    />
                  </View>
                  
                  <Text style={styles.goalAmount}>
                    {formatINR(goal.current)} / {formatINR(goal.target)}
                  </Text>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          progress >= 100 
                            ? styles.progressComplete 
                            : styles.progressPartial,
                          { width: `${Math.min(progress, 100)}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(progress)}% Complete
                    </Text>
                  </View>

                  {goal.targetDate && (
                    <View style={styles.targetDateContainer}>
                      <Text style={styles.targetDate}>
                        Target: {new Date(goal.targetDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                      {daysToTarget !== null && (
                        <Text style={[
                          styles.daysRemaining,
                          daysToTarget < 0 ? styles.overdue : 
                          daysToTarget <= 30 ? styles.urgent : styles.normal
                        ]}>
                          {daysToTarget > 0 
                            ? `${daysToTarget} days remaining`
                            : daysToTarget === 0 
                            ? "Target date is today!"
                            : `${Math.abs(daysToTarget)} days overdue`
                          }
                        </Text>
                      )}
                    </View>
                  )}

                  <Button
                    title="Update Progress"
                    variant="secondary"
                    onPress={() => promptUpdateGoal(goal)}
                    style={styles.updateButton}
                  />
                  
                  {progress >= 100 && (
                    <Text style={styles.goalComplete}>🎉 Goal Completed!</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No savings goals yet. Add your first goal above!
          </Text>
        )}
      </Card>

      {/* Savings Tips */}
      <Card>
        <Text style={styles.cardTitle}>💡 Savings Tips</Text>
        <View style={styles.tipsContainer}>
          <Text style={styles.tip}>• Set up automatic transfers to your savings account</Text>
          <Text style={styles.tip}>• Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings</Text>
          <Text style={styles.tip}>• Review and reduce unnecessary subscriptions monthly</Text>
          <Text style={styles.tip}>• Consider high-yield savings accounts for better returns</Text>
          <Text style={styles.tip}>• Track your progress regularly to stay motivated</Text>
          <Text style={styles.tip}>• Set realistic target dates to maintain motivation</Text>
        </View>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fundAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
  },
  fundTarget: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  progressContainer: {
    marginVertical: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPartial: {
    backgroundColor: '#f59e0b',
  },
  progressComplete: {
    backgroundColor: '#10b981',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  fundAdvice: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  halfButton: {
    flex: 0.48,
  },
  addGoalForm: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  goalItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  goalAmount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  targetDateContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  targetDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  daysRemaining: {
    fontSize: 11,
    fontWeight: '600',
  },
  normal: {
    color: '#10b981',
  },
  urgent: {
    color: '#f59e0b',
  },
  overdue: {
    color: '#ef4444',
  },
  updateButton: {
    marginTop: 12,
  },
  goalComplete: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
  },
  tipsContainer: {
    paddingLeft: 8,
  },
  tip: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default SavingScreen;