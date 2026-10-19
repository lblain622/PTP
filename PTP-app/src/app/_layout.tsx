import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/providers/auth';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider><Navigator /></AuthProvider>
      <AnimatedSplashOverlay />
    </ThemeProvider>
  );
}

function Navigator() {
  const { user, loading } = useAuth();
  if (loading) return <ActivityIndicator style={{ flex: 1 }} accessibilityLabel="Loading account" />;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!user}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
    </Stack.Protected>
    <Stack.Protected guard={!!user}>
      <Stack.Screen name="account" />
      <Stack.Protected guard={!!user?.name && !!user?.hometown}>
        <Stack.Screen name="explore" />
      </Stack.Protected>
    </Stack.Protected>
  </Stack>;
}
