// src/screens/SafetyScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { Card, Button, Input } from '../components/UI';
import { scamAlertStorage } from '../utils/storage';
import { ScamAnalyzer } from '../utils/scamAnalyzer';
import type { 
  ScamAlert, 
  ScamCheckFormData, 
  FeeCategory, 
  ScamAnalysisResult 
} from '../types';
import { COMMON_FEES } from '../types';

type SafetyTab = 'scam' | 'fees';

const SafetyScreen: React.FC = () => {
  const [scamAlerts, setScamAlerts] = useState<ScamAlert[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SafetyTab>('scam');
  
  // Scam check state
  const [scamCheck, setScamCheck] = useState<ScamCheckFormData>({
    text: '',
    url: '',
  });
  const [lastCheckResult, setLastCheckResult] = useState<ScamAnalysisResult | null>(null);
  
  // Fee calculator state
  const [selectedFeeCategory, setSelectedFeeCategory] = useState<FeeCategory>('Credit Card');

  useEffect(() => {
    loadScamAlerts();
  }, []);

  const loadScamAlerts = async (): Promise<void> => {
    try {
      const alerts = await scamAlertStorage.getAll();
      setScamAlerts(alerts);
    } catch (error) {
      console.error('Error loading scam alerts:', error);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadScamAlerts();
    setRefreshing(false);
  };

  const checkForScam = async (): Promise<void> => {
    if (!scamCheck.text.trim() && !scamCheck.url.trim()) {
      Alert.alert('Error', 'Please enter some text or URL to check');
      return;
    }

    const result = ScamAnalyzer.analyze(scamCheck.text, scamCheck.url);
    setLastCheckResult(result);

    // Save to scam alerts if suspicious
    if (result.riskScore >= 15) {
      try {
        const newAlert = await scamAlertStorage.add({
          text: scamCheck.text.substring(0, 100) + (scamCheck.text.length > 100 ? '...' : ''),
          url: scamCheck.url,
          riskLevel: result.riskLevel,
          riskScore: result.riskScore,
          detectedPatterns: result.detectedPatterns,
        });

        setScamAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
      } catch (error) {
        console.error('Error saving scam alert:', error);
      }
    }

    // Show result alert
    const advice = ScamAnalyzer.getScamAdvice(result.riskLevel);
    Alert.alert(
      `🛡️ Scam Check Result`,
      `Risk Level: ${result.riskLevel}\nRisk Score: ${result.riskScore}/100\n\n${advice}`,
      [{ text: 'OK' }]
    );
  };

  const clearScamHistory = async (): Promise<void> => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scam check history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await scamAlertStorage.clear();
              setScamAlerts([]);
            } catch (error) {
              console.error('Error clearing scam alerts:', error);
            }
          },
        },
      ]
    );
  };

  const openSafetyResource = async (url: string): Promise<void> => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', 'Could not open link');
    }
  };

  const callEmergencyNumber = async (number: string): Promise<void> => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch (err) {
      Alert.alert('Error', 'Could not make call');
    }
  };

  const updateScamCheck = (field: keyof ScamCheckFormData) => (value: string): void => {
    setScamCheck(prev => ({ ...prev, [field]: value }));
  };

  const selectFeeCategory = (category: FeeCategory): void => {
    setSelectedFeeCategory(category);
  };

  const setActiveTabHandler = (tab: SafetyTab) => (): void => {
    setActiveTab(tab);
  };

  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderScamTab = (): JSX.Element => (
    <View>
      {/* Scam Checker */}
      <Card>
        <Text style={styles.cardTitle}>🔍 Scam Radar</Text>
        <Text style={styles.subtitle}>
          Check messages, emails, or websites for potential scams
        </Text>
        
        <Input
          label="Message/Email Text"
          value={scamCheck.text}
          onChangeText={updateScamCheck('text')}
          placeholder="Paste suspicious message here..."
          multiline={true}
        />
        
        <Input
          label="Website URL (Optional)"
          value={scamCheck.url}
          onChangeText={updateScamCheck('url')}
          placeholder="https://suspicious-website.com"
        />

        <Button 
          title="🛡️ Check for Scams" 
          onPress={checkForScam}
          style={styles.checkButton}
        />

        {lastCheckResult && (
          <View style={[styles.resultBox, { borderColor: lastCheckResult.riskColor }]}>
            <Text style={[styles.resultTitle, { color: lastCheckResult.riskColor }]}>
              Risk Level: {lastCheckResult.riskLevel}
            </Text>
            <Text style={styles.resultScore}>
              Risk Score: {lastCheckResult.riskScore}/100
            </Text>
            
            {lastCheckResult.detectedPatterns.length > 0 && (
              <View style={styles.patternsContainer}>
                <Text style={styles.patternsTitle}>Detected Red Flags:</Text>
                {lastCheckResult.detectedPatterns.map((pattern, index) => (
                  <Text key={index} style={styles.patternItem}>
                    • {pattern}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Recent Scam Alerts */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>⚠️ Recent Checks</Text>
          {scamAlerts.length > 0 && (
            <Button
              title="Clear All"
              variant="danger"
              onPress={clearScamHistory}
              style={styles.clearButton}
            />
          )}
        </View>

        {scamAlerts.length > 0 ? (
          scamAlerts.map(alert => (
            <View key={alert.id} style={styles.alertItem}>
              <View style={styles.alertHeader}>
                <Text style={[styles.alertRisk, { color: getRiskLevelColor(alert.riskLevel) }]}>
                  {alert.riskLevel} Risk
                </Text>
                <Text style={styles.alertDate}>
                  {new Date(alert.timestamp).toLocaleDateString('en-IN')}
                </Text>
              </View>
              
              {alert.text && (
                <Text style={styles.alertText}>{alert.text}</Text>
              )}
              
              {alert.url && (
                <Text style={styles.alertUrl}>{alert.url}</Text>
              )}
              
              <Text style={styles.alertScore}>
                Risk Score: {alert.riskScore}/100
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No recent scam checks. Use the scanner above to check suspicious content.
          </Text>
        )}
      </Card>

      {/* Safety Resources */}
      <Card>
        <Text style={styles.cardTitle}>🆘 Emergency Contacts</Text>
        <View style={styles.emergencyContainer}>
          <Button
            title="📞 Cyber Crime Helpline: 1930"
            variant="secondary"
            onPress={() => callEmergencyNumber('1930')}
            style={styles.emergencyButton}
          />
          <Button
            title="🚔 Police Emergency: 100"
            variant="secondary"
            onPress={() => callEmergencyNumber('100')}
            style={styles.emergencyButton}
          />
          <Button
            title="💳 Bank Fraud Helpline"
            variant="secondary"
            onPress={() => Alert.alert(
              'Bank Helplines',
              'SBI: 1800-2000\nHDFC: 1800-2700\nICICI: 1800-200-3344\nAxis: 1800-200-5577\n\nCall your bank immediately if you suspect fraud!'
            )}
            style={styles.emergencyButton}
          />
        </View>
      </Card>

      {/* Scam Prevention Tips */}
      <Card>
        <Text style={styles.cardTitle}>🛡️ Stay Safe Online</Text>
        <View style={styles.tipsContainer}>
          <Text style={styles.tip}>• Never share OTPs, passwords, or card details</Text>
          <Text style={styles.tip}>• Banks never ask for sensitive info via calls/SMS</Text>
          <Text style={styles.tip}>• Verify unknown contacts independently</Text>
          <Text style={styles.tip}>• Be wary of "urgent" or "limited time" offers</Text>
          <Text style={styles.tip}>• Check website URLs carefully before entering data</Text>
          <Text style={styles.tip}>• Use official apps and websites only</Text>
        </View>
      </Card>
    </View>
  );

  const renderFeesTab = (): JSX.Element => (
    <View>
      {/* Fee Category Selector */}
      <Card>
        <Text style={styles.cardTitle}>💰 Fee Transparency</Text>
        <Text style={styles.subtitle}>
          Know the common fees before you sign up
        </Text>
        
        <View style={styles.categorySelector}>
          {Object.keys(COMMON_FEES).map(category => (
            <Button
              key={category}
              title={category}
              variant={selectedFeeCategory === category ? 'primary' : 'secondary'}
              onPress={() => selectFeeCategory(category as FeeCategory)}
              style={styles.categoryButton}
            />
          ))}
        </View>
      </Card>

      {/* Fee Details */}
      <Card>
        <Text style={styles.cardTitle}>{selectedFeeCategory} Fees</Text>
        <View style={styles.feesList}>
          {Object.entries(COMMON_FEES[selectedFeeCategory]).map(([feeName, feeData]) => (
            <View key={feeName} style={styles.feeItem}>
              <Text style={styles.feeName}>{feeName}</Text>
              <Text style={styles.feeAmount}>
                ₹{feeData.min} - ₹{feeData.max}
              </Text>
              <Text style={styles.feeDescription}>{feeData.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.feeAdviceContainer}>
          <Text style={styles.feeAdviceTitle}>💡 Pro Tips:</Text>
          {selectedFeeCategory === 'Credit Card' && (
            <>
              <Text style={styles.tip}>• Look for lifetime free cards to avoid annual fees</Text>
              <Text style={styles.tip}>• Pay bills on time to avoid late payment charges</Text>
              <Text style={styles.tip}>• Use credit cards wisely to stay within limits</Text>
            </>
          )}
          {selectedFeeCategory === 'Bank Account' && (
            <>
              <Text style={styles.tip}>• Maintain minimum balance to avoid charges</Text>
              <Text style={styles.tip}>• Use your bank's ATMs to avoid extra fees</Text>
              <Text style={styles.tip}>• Consider zero-balance accounts if available</Text>
            </>
          )}
          {selectedFeeCategory === 'Investment' && (
            <>
              <Text style={styles.tip}>• Compare expense ratios before investing</Text>
              <Text style={styles.tip}>• Look for direct plans to save on commissions</Text>
              <Text style={styles.tip}>• Understand exit loads before early withdrawal</Text>
            </>
          )}
          {selectedFeeCategory === 'Insurance' && (
            <>
              <Text style={styles.tip}>• Buy term insurance early for lower premiums</Text>
              <Text style={styles.tip}>• Avoid unnecessary riders you don't need</Text>
              <Text style={styles.tip}>• Read policy terms carefully before buying</Text>
            </>
          )}
        </View>
      </Card>

      {/* Hidden Fees Warning */}
      <Card>
        <Text style={styles.cardTitle}>⚠️ Watch Out for Hidden Fees</Text>
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Always ask about these before signing up:
          </Text>
          <Text style={styles.tip}>• Processing fees or setup charges</Text>
          <Text style={styles.tip}>• Transaction limits and excess usage fees</Text>
          <Text style={styles.tip}>• Early closure or exit penalties</Text>
          <Text style={styles.tip}>• Third-party service charges</Text>
          <Text style={styles.tip}>• Currency conversion or foreign transaction fees</Text>
          
          <Text style={[styles.warningText, {marginTop: 12}]}>
            🔍 Pro Tip: Always read the fine print and ask for a complete fee schedule!
          </Text>
        </View>
      </Card>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Tab Selector */}
      <Card>
        <View style={styles.tabContainer}>
          <Button
            title="🛡️ Scam Protection"
            variant={activeTab === 'scam' ? 'primary' : 'secondary'}
            onPress={setActiveTabHandler('scam')}
            style={styles.tabButton}
          />
          <Button
            title="💰 Fee Transparency"
            variant={activeTab === 'fees' ? 'primary' : 'secondary'}
            onPress={setActiveTabHandler('fees')}
            style={styles.tabButton}
          />
        </View>
      </Card>

      {activeTab === 'scam' ? renderScamTab() : renderFeesTab()}
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
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 0.48,
  },
  checkButton: {
    marginTop: 16,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultBox: {
    marginTop: 16,
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  patternsContainer: {
    marginTop: 8,
  },
  patternsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  patternItem: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 8,
    marginBottom: 2,
  },
  alertItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertRisk: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  alertDate: {
    fontSize: 10,
    color: '#9ca3af',
  },
  alertText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  alertUrl: {
    fontSize: 10,
    color: '#2563eb',
    marginBottom: 4,
  },
  alertScore: {
    fontSize: 10,
    color: '#6b7280',
  },
  emergencyContainer: {
    gap: 8,
  },
  emergencyButton: {
    marginBottom: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryButton: {
    flex: 0.48,
    marginBottom: 8,
  },
  feesList: {
    marginBottom: 16,
  },
  feeItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  feeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  feeDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  feeAdviceContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
  },
  feeAdviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 8,
  },
  warningContainer: {
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
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
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
  },
});

export default SafetyScreen;