export type ExpenseCategory = 
  | 'Food & Dining'
  | 'Transportation'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills & Utilities'
  | 'Healthcare'
  | 'Education'
  | 'Travel'
  | 'Other';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  date: string; // ISO date string
  createdAt: string; // ISO date string
}

export interface Budget {
  amount: number;
  updatedAt: string; // ISO date string
}

export interface EnhancedBudget extends Budget {
  category: ExpenseCategory;
  monthlyLimit?: number;
  weeklySpent?: number;
  dailyAverage?: number;
  lastUpdated: string;
}

export interface BudgetCollection {
  [category: string]: Budget;
}

export interface EmergencyFund {
  target: number;
  current: number;
  updatedAt: string | null;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  targetDate?: string; // ISO date string
  category?: 'Emergency Fund' | 'Short Term' | 'Long Term' | 'Investment';
  priority?: 'High' | 'Medium' | 'Low';
  createdAt: string; // ISO date string
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface ScamAnalysisResult {
  riskScore: number;
  riskLevel: RiskLevel;
  riskColor: string;
  detectedPatterns: string[];
  isScam: boolean;
}

export interface ScamAlert {
  id: string;
  text: string;
  url: string;
  riskLevel: RiskLevel;
  riskScore: number;
  detectedPatterns: string[];
  timestamp: string; // ISO date string
}

export interface BudgetStatus {
  spent: number;
  budget: number;
  percentage: number;
  status: 'good' | 'warning' | 'danger';
  remaining: number;
}

export type FeeCategory = 'Credit Card' | 'Bank Account' | 'Investment' | 'Insurance';

export interface FeeData {
  min: number | string;
  max: number | string;
  description: string;
}

export interface FeeStructure {
  [feeName: string]: FeeData;
}

export interface FeesCollection {
  [category in FeeCategory]: FeeStructure;
}

// Storage Keys
export enum StorageKeys {
  EXPENSES = 'aivest_expenses',
  BUDGETS = 'aivest_budgets',
  EMERGENCY_FUND = 'aivest_emergency_fund',
  SAVINGS_GOALS = 'aivest_savings_goals',
  USER_PREFERENCES = 'aivest_user_preferences',
  SCAM_ALERTS = 'aivest_scam_alerts',
}

// Navigation Types
export type RootTabParamList = {
  Spending: undefined;
  Saving: undefined;
  Safety: undefined;
  Profile: undefined;
};

// Component Props Types
export interface CardProps {
  children: React.ReactNode;
  style?: object;
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: object;
}

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  error?: string;
  style?: object;
}

// Utility Types
export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export interface MonthlyExpenseSummary {
  total: number;
  transactionCount: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
}

// API/Storage Response Types
export type StorageResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Form State Types
export interface ExpenseFormData {
  amount: string;
  category: ExpenseCategory;
  description: string;
  date: string;
}

export interface EmergencyFundFormData {
  target: string;
  current: string;
}

export interface SavingsGoalFormData {
  name: string;
  target: string;
  current: string;
  targetDate: string;
  category?: string;
  priority?: string;
}

// Scam Detection Types
export interface ScamCheckFormData {
  text: string;
  url: string;
}

// Constants
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Other'
];

export const SCAM_KEYWORDS: string[] = [
  'urgent', 'winner', 'congratulations', 'lottery', 'prize', 'claim now',
  'act fast', 'limited time', 'guaranteed', 'risk-free', 'no questions asked',
  'send money', 'wire transfer', 'bitcoin', 'cryptocurrency', 'gift card',
  'verify account', 'suspend account', 'click here immediately', 'confirm identity',
  'tax refund', 'government grant', 'inheritance', 'prince', 'beneficiary'
];

export const SUSPICIOUS_DOMAINS: string[] = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co'
];

export const COMMON_FEES: FeesCollection = {
  'Credit Card': {
    'Annual Fee': { min: 0, max: 5000, description: 'Yearly card maintenance fee' },
    'Late Payment': { min: 100, max: 1500, description: 'Fee for missing payment deadline' },
    'Cash Advance': { min: 250, max: 1000, description: 'Fee for cash withdrawal from credit line' },
    'Foreign Transaction': { min: '2%', max: '4%', description: 'Fee for international purchases' },
    'Overlimit': { min: 500, max: 2000, description: 'Fee for exceeding credit limit' },
  },
  'Bank Account': {
    'Monthly Maintenance': { min: 0, max: 750, description: 'Monthly account maintenance fee' },
    'ATM Fee': { min: 20, max: 50, description: 'Fee for using other bank ATMs' },
    'Cheque Book': { min: 50, max: 200, description: 'Fee for issuing cheque books' },
    'SMS Alerts': { min: 25, max: 100, description: 'Monthly SMS notification charges' },
    'Minimum Balance': { min: 100, max: 1000, description: 'Penalty for not maintaining minimum balance' },
  },
  'Investment': {
    'Expense Ratio': { min: '0.1%', max: '3%', description: 'Annual mutual fund management fee' },
    'Exit Load': { min: '0%', max: '3%', description: 'Fee for early redemption' },
    'Brokerage': { min: '0.01%', max: '1%', description: 'Fee for buying/selling stocks' },
    'Account Opening': { min: 0, max: 1000, description: 'One-time demat account setup fee' },
    'Annual Maintenance': { min: 0, max: 800, description: 'Yearly demat account maintenance' },
  },
  'Insurance': {
    'Premium': { min: '1%', max: '10%', description: 'Annual insurance premium' },
    'Rider Fee': { min: 50, max: 500, description: 'Additional coverage charges' },
    'Policy Admin': { min: 100, max: 1000, description: 'Annual policy administration fee' },
    'Surrender': { min: '1%', max: '10%', description: 'Fee for early policy termination' },
  }
};

export interface InlineEditState {
  editingExpense: string | null;
  editingGoal: string | null;
  editingBudget: string | null;
  editForm: Record<string, any>;
}