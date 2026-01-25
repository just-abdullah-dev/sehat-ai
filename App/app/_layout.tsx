// Root Layout with Authentication

import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isGuest } = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    // Prevent authenticated users from accessing auth screens.
    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }

    // Prevent unauthenticated (and non-guest) users from accessing protected screens.
    if (!isAuthenticated && !isGuest && inTabsGroup) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, isGuest, segments, router]);

  if (isLoading) {
    return <LoadingSpinner visible={true} message="Loading..." />;
  }

  return (
    <NavThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Report Viewer',
            headerShown: true,
          }}
        />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
