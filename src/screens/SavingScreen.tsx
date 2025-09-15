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
import { Card, Button, Input } from '../components/UI';
import { emergencyFundStorage, savingsGoalStorage } from '../utils/storage';
import type { 
  EmergencyFund, 
  SavingsGoal, 
  EmergencyFundFormData, 
  SavingsGoalFormData 
} from '../types';

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
    const target = parseFloat(emergencyEdit.target);
    const current = parseFloat(emergencyEdit.current);

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
    const target = parseFloat(newGoal.target);
    const current = parseFloat(newGoal.current || '0');

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

    try {
      const goal = await savingsGoalStorage.add({
        name: newGoal.name.trim(),
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

  const updateGoalProgress = async (goalId: string, newAmount: string): Promise<void> => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const updated = await savingsGoalStorage.update(goalId, { current: amount });
      if (updated) {
        setSavingsGoals(prev => 
          prev.map(goal => goal.id === goalId ? updated : goal)
        );
        
        // Check if goal is completed
        if (amount >= updated.target) {
          Alert.alert('🎉 Congratulations!', `You've reached your "${updated.name}" savings goal!`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update savings goal');
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
              Alert.alert('Error', 'Failed to delete savings goal');
            }
          },
        },
      ]
    );
  };

  const getEmergencyFundProgress = (): number => {
    if (emergencyFund.target === 0) return 0;
    return Math.min((emergencyFund.current / emergencyFund.target) * 100, 100);
  };

  const getGoalProgress = (goal: SavingsGoal): number => {
    if (goal.target === 0) return 0;
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

  const startEditEmergency = (): void => {
    setEmergencyEdit({
      target: emergencyFund.target.toString(),
      current: emergencyFund.current.toString(),
    });
    setShowEditEmergency(true);
  };

  const updateEmergencyEdit = (field: keyof EmergencyFundFormData) => (value: string): void => {
    setEmergencyEdit(prev => ({ ...prev, [field]: value }));
  };

  const updateNewGoal = (field: keyof SavingsGoalFormData) => (value: string): void => {
    setNewGoal(prev => ({ ...prev, [field]: value }));
  };

  const promptUpdateGoal = (goal: SavingsGoal): void => {
    Alert.prompt(
      'Update Goal',
      `Enter new amount for ${goal.name}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Update', 
          onPress: (amount) => {
            if (amount) {
              updateGoalProgress(goal.id, amount);
            }
          }
        }
      ],
      'plain-text',
      goal.current.toString()
    );
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
            onPress={startEditEmergency}
            style={styles.editButton}
          />
        </View>
        
        {!showEditEmergency ? (
          <View>
            <View style={styles.fundProgress}>
              <Text style={styles.fundAmount}>
                ₹{emergencyFund.current.toLocaleString('en-IN')} / ₹{emergencyFund.target.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.fundPercentage}>
                {getEmergencyFundProgress().toFixed(1)}% complete
              </Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getEmergencyFundProgress()}%` },
                  getEmergencyFundProgress() >= 100 ? styles.progressComplete : styles.progressPartial
                ]} 
              />
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
            <Input
              label="Target Amount (₹)"
              value={emergencyEdit.target}
              onChangeText={updateEmergencyEdit('target')}
              placeholder="100000"
              keyboardType="numeric"
            />
            
            <Input
              label="Current Amount (₹)"
              value={emergencyEdit.current}
              onChangeText={updateEmergencyEdit('current')}
              placeholder="0"
              keyboardType="numeric"
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
            
            <Input
              label="Target Amount (₹)"
              value={newGoal.target}
              onChangeText={updateNewGoal('target')}
              placeholder="50000"
              keyboardType="numeric"
            />
            
            <Input
              label="Current Amount (₹)"
              value={newGoal.current}
              onChangeText={updateNewGoal('current')}
              placeholder="0"
              keyboardType="numeric"
            />
            
            <Input
              label="Target Date (Optional)"
              value={newGoal.targetDate}
              onChangeText={updateNewGoal('targetDate')}
              placeholder="YYYY-MM-DD"
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
          savingsGoals.map(goal => {
            const progress = getGoalProgress(goal);
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
                
                <View style={styles.goalProgress}>
                  <Text style={styles.goalAmount}>
                    ₹{goal.current.toLocaleString('en-IN')} / ₹{goal.target.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.goalPercentage}>
                    {progress.toFixed(1)}% complete
                  </Text>
                </View>
                
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${progress}%` },
                      progress >= 100 ? styles.progressComplete : styles.progressPartial
                    ]} 
                  />
                </View>
                
                {goal.targetDate && (
                  <Text style={styles.goalDate}>
                    {daysToTarget !== null && (
                      daysToTarget > 0 
                        ? `${daysToTarget} days to target date`
                        : daysToTarget === 0 
                        ? "Target date is today!"
                        : `${Math.abs(daysToTarget)} days past target date`
                    )}
                  </Text>
                )}
                
                <View style={styles.goalActions}>
                  <Button
                    title="Update Progress"
                    onPress={() => promptUpdateGoal(goal)}
                    style={styles.updateButton}
                  />
                </View>
                
                {progress >= 100 && (
                  <Text style={styles.goalComplete}>🎉 Goal Completed!</Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>
            No savings goals yet. Add your first goal to start tracking your progress!
          </Text>
        )}
      </Card>

      {/* Savings Tips */}
      <Card>
        <Text style={styles.cardTitle}>💡 Savings Tips</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tip}>• Automate your savings - Set up automatic transfers</Text>
          <Text style={styles.tip}>• Use the 50/30/20 rule - 50% needs, 30% wants, 20% savings</Text>
          <Text style={styles.tip}>• Start small - Even ₹100/month adds up over time</Text>
          <Text style={styles.tip}>• Track your progress - Regular monitoring keeps you motivated</Text>
          <Text style={styles.tip}>• Emergency fund first - Aim for 3-6 months of expenses</Text>
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
    minHeight: 32,
  },
  fundProgress: {
    alignItems: 'center',
    marginBottom: 12,
  },
  fundAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  fundPercentage: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPartial: {
    backgroundColor: '#3b82f6',
  },
  progressComplete: {
    backgroundColor: '#10b981',
  },
  fundAdvice: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  goalItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    color: '#374151',
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 0,
    minHeight: 32,
  },
  goalProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  goalPercentage: {
    fontSize: 12,
    color: '#6b7280',
  },
  goalDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  goalActions: {
    marginTop: 8,
  },
  updateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  goalComplete: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tipsList: {
    marginTop: 8,
  },
  tip: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default SavingScreen;