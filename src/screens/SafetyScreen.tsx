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
                <Text style={styles.patternsTitle}>Detected Issues:</Text>
                {lastCheckResult.detectedPatterns.map((pattern, index) => (
                  <Text key={index} style={styles.pattern}>• {pattern}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Scam Alerts History */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📊 Recent Checks</Text>
          {scamAlerts.length > 0 && (
            <Button
              title="Clear"
              variant="secondary"
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
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.text}
              </Text>
              {alert.url && (
                <Text style={styles.alertUrl} numberOfLines={1}>
                  URL: {alert.url}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No recent scam checks. Use the scanner above to check suspicious content.
          </Text>
        )}
      </Card>

      {/* Safety Tips */}
      <Card>
        <Text style={styles.cardTitle}>🛡️ Safety Tips</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tip}>• Never share OTP, PIN, or passwords with anyone</Text>
          <Text style={styles.tip}>• Banks/Government never ask for money via email/SMS</Text>
          <Text style={styles.tip}>• Always verify before clicking links or downloading files</Text>
          <Text style={styles.tip}>• Be suspicious of urgent requests for money</Text>
          <Text style={styles.tip}>• Use official websites and apps only</Text>
          <Text style={styles.tip}>• Report suspicious activities to authorities</Text>
        </View>
      </Card>

      {/* Safety Resources */}
      <Card>
        <Text style={styles.cardTitle}>📞 Report Scams</Text>
        <View style={styles.resourcesList}>
          <Button
            title="🚨 Cyber Crime Helpline: 1930"
            variant="secondary"
            onPress={() => callEmergencyNumber('1930')}
            style={styles.resourceButton}
          />
          <Button
            title="📧 Report to cybercrime.gov.in"
            variant="secondary"
            onPress={() => openSafetyResource('https://cybercrime.gov.in')}
            style={styles.resourceButton}
          />
          <Button
            title="💳 Report Banking Fraud"
            variant="secondary"
            onPress={() => callEmergencyNumber('155260')}
            style={styles.resourceButton}
          />
        </View>
      </Card>
    </View>
  );

  const renderFeesTab = (): JSX.Element => (
    <View>
      {/* Fee Calculator */}
      <Card>
        <Text style={styles.cardTitle}>💰 Fee Transparency Calculator</Text>
        <Text style={styles.subtitle}>
          Understand common fees for financial products
        </Text>
        
        <View style={styles.categorySelector}>
          <Text style={styles.label}>Select Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(Object.keys(COMMON_FEES) as FeeCategory[]).map(category => (
              <Button
                key={category}
                title={category}
                variant={selectedFeeCategory === category ? 'primary' : 'secondary'}
                onPress={() => selectFeeCategory(category)}
                style={styles.categoryButton}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.feesContainer}>
          {Object.entries(COMMON_FEES[selectedFeeCategory]).map(([feeName, feeData]) => (
            <View key={feeName} style={styles.feeItem}>
              <View style={styles.feeHeader}>
                <Text style={styles.feeName}>{feeName}</Text>
                <Text style={styles.feeRange}>
                  {typeof feeData.min === 'string' ? feeData.min : `₹${feeData.min}`} - {' '}
                  {typeof feeData.max === 'string' ? feeData.max : `₹${feeData.max}`}
                </Text>
              </View>
              <Text style={styles.feeDescription}>{feeData.description}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Fee Avoidance Tips */}
      <Card>
        <Text style={styles.cardTitle}>💡 How to Avoid Unnecessary Fees</Text>
        <View style={styles.tipsList}>
          {selectedFeeCategory === 'Credit Card' && (
            <>
              <Text style={styles.tip}>• Pay full amount before due date to avoid interest</Text>
              <Text style={styles.tip}>• Choose cards with no annual fee or fee waivers</Text>
              <Text style={styles.tip}>• Avoid cash advances - use debit card instead</Text>
              <Text style={styles.tip}>• Set up auto-pay to avoid late payment fees</Text>
            </>
          )}
          {selectedFeeCategory === 'Bank Account' && (
            <>
              <Text style={styles.tip}>• Maintain minimum balance to avoid penalties</Text>
              <Text style={styles.tip}>• Use your bank's ATMs to avoid withdrawal fees</Text>
              <Text style={styles.tip}>• Opt for digital statements to save on postage</Text>
              <Text style={styles.tip}>• Choose zero-balance accounts if eligible</Text>
            </>
          )}
          {selectedFeeCategory === 'Investment' && (
            <>
              <Text style={styles.tip}>• Compare expense ratios before investing</Text>
              <Text style={styles.tip}>• Hold investments long-term to avoid exit loads</Text>
              <Text style={styles.tip}>• Use direct plans to save on distributor fees</Text>
              <Text style={styles.tip}>• Consider low-cost index funds</Text>
            </>
          )}
          {selectedFeeCategory === 'Insurance' && (
            <>
              <Text style={styles.tip}>• Compare premiums across multiple insurers</Text>
              <Text style={styles.tip}>• Pay annually instead of monthly to save costs</Text>
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
  pattern: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  alertItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  },
  alertDate: {
    fontSize: 10,
    color: '#9ca3af',
  },
  alertText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  alertUrl: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  categorySelector: {
    marginBottom: 16,
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
  feesContainer: {
    marginTop: 8,
  },
  feeItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  feeRange: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  feeDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
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
  resourcesList: {
    marginTop: 8,
  },
  resourceButton: {
    marginBottom: 8,
  },
  warningContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SafetyScreen;