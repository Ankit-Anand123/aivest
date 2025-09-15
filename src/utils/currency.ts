export const formatNumberWithCommas = (value: string | number): string => {
  const stringValue = typeof value === 'number' ? value.toString() : value;
  
  // Remove any existing commas and non-numeric characters except decimal
  const cleanValue = stringValue.replace(/[^0-9.]/g, '');
  
  if (!cleanValue) return '';
  
  // Split by decimal point
  const [integerPart, decimalPart] = cleanValue.split('.');
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return with decimal if it exists
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

/**
 * Removes commas from a formatted string (e.g., "1,000" -> "1000")
 */
export const removeCommas = (value: string): string => {
  return value.replace(/,/g, '');
};

/**
 * Gets numeric value from formatted string
 */
export const getNumericValue = (formattedValue: string): number => {
  const cleanValue = removeCommas(formattedValue);
  return parseFloat(cleanValue) || 0;
};

/**
 * Formats currency for display with symbol and commas
 */
export const formatCurrency = (amount: number | string, symbol: string = '₹'): string => {
  const numericAmount = typeof amount === 'string' ? getNumericValue(amount) : amount;
  const formattedAmount = formatNumberWithCommas(numericAmount.toString());
  return `${symbol}${formattedAmount}`;
};

/**
 * Formats currency for Indian Rupees specifically
 */
export const formatINR = (amount: number | string): string => {
  return formatCurrency(amount, '₹');
};

/**
 * Validates if a string contains a valid number format
 */
export const isValidNumber = (value: string): boolean => {
  const cleanValue = removeCommas(value);
  return !isNaN(parseFloat(cleanValue)) && isFinite(parseFloat(cleanValue));
};