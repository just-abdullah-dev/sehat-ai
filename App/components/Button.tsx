// Reusable Button Component

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  const getReadableTextColor = () => {
    if (variant === 'primary') {
      return isDark ? colors.background : '#fff';
    }

    if (variant === 'outline') {
      return isDark ? colors.text : colors.tint;
    }

    if (variant === 'secondary' && isDark) {
      return colors.text;
    }

    return '#fff';
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      ...(size === 'small' && styles.buttonSmall),
      ...(size === 'large' && styles.buttonLarge),
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, backgroundColor: colors.tint };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#2A2A2A' : colors.icon,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? '#3A3A3A' : 'transparent',
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#222426' : 'transparent',
          borderWidth: 2,
          borderColor: colors.tint,
        };
      case 'danger':
        return { ...baseStyle, backgroundColor: '#FF6B6B' };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...styles.text,
      ...(size === 'small' && styles.textSmall),
      ...(size === 'large' && styles.textLarge),
    };

    return { ...baseStyle, color: getReadableTextColor() };
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getReadableTextColor()} />
      ) : (
        <Text style={[textStyle, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
  },
  buttonLarge: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.5,
  },
});
