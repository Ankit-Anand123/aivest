// src/components/UI/DateInput.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export interface DateInputProps {
  label?: string;
  value: string; // ISO date string (YYYY-MM-DD)
  onChangeDate: (date: string) => void;
  placeholder?: string;
  error?: string;
  style?: object;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChangeDate,
  placeholder = 'Select date',
  error,
  style,
  minimumDate,
  maximumDate,
  mode = 'date',
}) => {
  const [showPicker, setShowPicker] = useState<boolean>(false);

  // Convert ISO string to Date object
  const getDateFromValue = (): Date => {
    if (!value) return new Date();
    return new Date(value);
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return placeholder;
    
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };
    
    return date.toLocaleDateString('en-IN', options);
  };

  // Handle date change from picker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
    
    if (selectedDate) {
      // Convert to ISO string (YYYY-MM-DD format)
      const isoString = selectedDate.toISOString().split('T')[0];
      onChangeDate(isoString);
    }
  };

  const openDatePicker = () => {
    setShowPicker(true);
  };

  const closeDatePicker = () => {
    setShowPicker(false);
  };

  return (
    <View style={[styles.container, style as ViewStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          error && styles.dateButtonError,
          !value && styles.dateButtonPlaceholder,
        ]}
        onPress={openDatePicker}
        activeOpacity={0.8}
      >
        <View style={styles.dateButtonContent}>
          <Text
            style={[
              styles.dateButtonText,
              !value && styles.placeholderText,
            ]}
          >
            {formatDateForDisplay(value)}
          </Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </View>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {showPicker && (
        <DateTimePicker
          value={getDateFromValue()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onTouchCancel={closeDatePicker}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    minHeight: 48,
    justifyContent: 'center',
  },
  dateButtonError: {
    borderColor: '#dc2626',
  },
  dateButtonPlaceholder: {
    borderColor: '#d1d5db',
  },
  dateButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  calendarIcon: {
    fontSize: 20,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});