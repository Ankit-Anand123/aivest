// Create a new file: src/components/CategorySelectionModal.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EXPENSE_CATEGORIES } from '../../types';

interface CategorySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
}

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'Food & Dining': '🍽️',
    'Transportation': '🚗',
    'Shopping': '🛍️',
    'Entertainment': '🎬',
    'Bills & Utilities': '⚡',
    'Healthcare': '🏥',
    'Education': '📚',
    'Travel': '✈️',
    'Other': '📦'
  };
  return icons[category] || '💰';
};

const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  visible,
  onClose,
  onSelectCategory,
}) => {
  const handleSelectCategory = (category: string) => {
    onClose();
    onSelectCategory(category);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Modal Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Budget Category</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header Text */}
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Select a category for your first budget</Text>
            <Text style={styles.introText}>
              Start with the category where you spend the most money for maximum impact on your financial goals.
            </Text>
          </View>

          {/* Popular Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Most Popular</Text>
            <View style={styles.grid}>
              {['Food & Dining', 'Transportation', 'Shopping', 'Entertainment'].map(category => {
                const icon = getCategoryIcon(category);
                return (
                  <TouchableOpacity
                    key={category}
                    style={styles.card}
                    onPress={() => handleSelectCategory(category)}
                  >
                    <Text style={styles.cardIcon}>{icon}</Text>
                    <Text style={styles.cardTitle}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* All Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 All Categories</Text>
            <View style={styles.list}>
              {EXPENSE_CATEGORIES.map((category, index) => {
                const icon = getCategoryIcon(category);
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.listItem,
                      index === EXPENSE_CATEGORIES.length - 1 && styles.listItemLast
                    ]}
                    onPress={() => handleSelectCategory(category)}
                  >
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listIcon}>{icon}</Text>
                      <Text style={styles.listTitle}>{category}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  intro: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  card: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  list: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  listTitle: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default CategorySelectionModal;