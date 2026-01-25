// Splash screen
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, isGuest } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated || isGuest) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      }, 2500); // show splash for 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, isGuest, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
      <Text style={[styles.title, { color: colors.text }]}>Sehat AI</Text>
      <Text style={[styles.tagline, { color: colors.icon }]}>
        AI-powered TB & Pneumonia Detection
      </Text>
      <ActivityIndicator size="large" color={colors.tint} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
    },
    tagline: {
        fontSize: 16,
        marginTop: 8,
    },
    spinner: {
        marginTop: 50,
    },
});
