import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../theme/colors';

export const Button = ({ onPress, title, loading, disabled, style, variant = 'primary' }: any) => {
  const isOutline = variant === 'outline';

  const Content = () => (
    <>
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.primary : COLORS.white} />
      ) : (
        <Text style={[styles.text, isOutline && styles.textOutline]}>{title}</Text>
      )}
    </>
  );

  if (isOutline) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled || loading} 
        style={[styles.button, styles.outline, disabled && { opacity: 0.6 }, style]}
      >
        <Content />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading} 
      style={[styles.buttonContainer, disabled && { opacity: 0.6 }, style]}
    >
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Content />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  text: { 
    color: COLORS.white, 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textOutline: {
    color: COLORS.primary,
  }
});
