import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
  style?: object;
}

// Basic spinner component
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#2563eb',
  text,
  overlay = false,
  style,
}) => {
  const containerStyle = overlay ? styles.overlay : styles.container;

  return (
    <View style={[containerStyle, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
};

// Full screen loading overlay
export const LoadingOverlay: React.FC<{
  visible: boolean;
  text?: string;
  color?: string;
}> = ({ 
  visible, 
  text = 'Loading...', 
  color = '#2563eb' 
}) => {
  if (!visible) return null;

  return (
    <View style={styles.fullOverlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color={color} />
        <Text style={[styles.overlayText, { color }]}>{text}</Text>
      </View>
    </View>
  );
};

// Card loading skeleton
export const LoadingCard: React.FC<{
  height?: number;
  animated?: boolean;
}> = ({ 
  height = 100, 
  animated = true 
}) => {
  return (
    <View style={[styles.skeletonCard, { height }]}>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '40%' }]} />
        {animated && (
          <ActivityIndicator 
            size="small" 
            color="#9ca3af" 
            style={styles.skeletonSpinner}
          />
        )}
      </View>
    </View>
  );
};

// Button loading state
export const LoadingButton: React.FC<{
  loading: boolean;
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: object;
}> = ({
  loading,
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}) => {
  return (
    <View style={[styles.buttonContainer, style]}>
      <View 
        style={[
          styles.button,
          styles[variant],
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator 
              size="small" 
              color={variant === 'secondary' ? '#374151' : '#ffffff'} 
            />
            <Text style={[styles.buttonText, styles[`text${variant}`], styles.loadingText]}>
              {title}
            </Text>
          </View>
        ) : (
          <Text 
            style={[styles.buttonText, styles[`text${variant}`]]}
            onPress={onPress}
          >
            {title}
          </Text>
        )}
      </View>
    </View>
  );
};

// Inline loading with icon
export const InlineLoading: React.FC<{
  text?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: number;
}> = ({
  text = 'Loading...',
  icon,
  color = '#6b7280',
  size = 16,
}) => {
  return (
    <View style={styles.inlineContainer}>
      {icon ? (
        <Ionicons name={icon} size={size} color={color} />
      ) : (
        <ActivityIndicator size="small" color={color} />
      )}
      <Text style={[styles.inlineText, { color }]}>{text}</Text>
    </View>
  );
};

// List loading placeholder
export const LoadingList: React.FC<{
  itemCount?: number;
  itemHeight?: number;
}> = ({ 
  itemCount = 5, 
  itemHeight = 80 
}) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: itemCount }, (_, index) => (
        <LoadingCard key={index} height={itemHeight} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Full screen overlay
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },

  // Skeleton loading
  skeletonCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonSpinner: {
    alignSelf: 'center',
    marginTop: 8,
  },

  // Button loading
  buttonContainer: {
    position: 'relative',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  textprimary: {
    color: '#ffffff',
  },
  textsecondary: {
    color: '#374151',
  },
  textdanger: {
    color: '#ffffff',
  },
  loadingText: {
    marginLeft: 8,
  },

  // Inline loading
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  inlineText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },

  // List loading
  listContainer: {
    paddingVertical: 8,
  },
});