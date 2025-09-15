// src/components/UI/CurrencyInput.tsx
import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle } from 'react-native';
import type { InputProps } from '../../types';

// Utility functions for currency formatting
const formatNumberWithCommas = (value: string): string => {
  // Remove any existing commas and non-numeric characters except decimal
  const cleanValue = value.replace(/[^0-9.]/g, '');
  
  // Split by decimal point
  const [integerPart, decimalPart] = cleanValue.split('.');
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return with decimal if it exists
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

const removeCommas = (value: string): string => {
  return value.replace(/,/g, '');
};

// Extended props for currency input
interface CurrencyInputProps extends Omit<InputProps, 'keyboardType'> {
  currency?: string; // e.g., '₹', '$', '€'
  showCurrency?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  multiline = false,
  error,
  style,
  currency = '₹',
  showCurrency = true,
}) => {
  const handleTextChange = (text: string) => {
    // Format the input with commas
    const formattedText = formatNumberWithCommas(text);
    
    // Call the parent's onChangeText with the raw number (no commas) for calculation purposes
    // But we'll also need to store the formatted version for display
    onChangeText(formattedText);
  };

  // Helper function to get the numeric value without formatting
  const getNumericValue = (formattedValue: string): number => {
    const cleanValue = removeCommas(formattedValue);
    return parseFloat(cleanValue) || 0;
  };

  return (
    <View style={[styles.container, style as ViewStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {showCurrency && (
          <Text style={styles.currencySymbol}>{currency}</Text>
        )}
        <TextInput
          style={[
            styles.input, 
            showCurrency && styles.inputWithCurrency,
            error && styles.inputError, 
            multiline && styles.multiline
          ]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          keyboardType="numeric"
          multiline={multiline}
          placeholderTextColor="#9ca3af"
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// Regular Input component (unchanged)
export const Input: React.FC<InputProps> = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default',
  multiline = false,
  error,
  style 
}) => {
  return (
    <View style={[styles.container, style as ViewStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input, 
          error && styles.inputError, 
          multiline && styles.multiline
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor="#9ca3af"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingLeft: 12,
    paddingRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    flex: 1,
  },
  inputWithCurrency: {
    borderWidth: 0,
    flex: 1,
    paddingLeft: 0,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});