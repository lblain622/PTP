import { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { authRequest, Session } from '@/lib/auth-api';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AuthScreen({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const [name, setName] = useState('');
  const [hometown, setHometown] = useState('');
  const [social, setSocial] = useState(false);
  const attempt = useRef(0);
  useEffect(() => () => { attempt.current += 1; }, []);

  async function handleSocial(provider: 'google' | 'apple') {
    if (busy) return;
    const current = ++attempt.current;
    const popup = Platform.OS === 'web' ? window.open('about:blank', '_blank', 'width=500,height=700') : null;
    setBusy(true); setSocial(true); setError('');
    try {
      if (Platform.OS === 'web' && !popup) throw new Error('Allow pop-ups to sign in with ' + provider + '.');
      const start = await authRequest<{ url: string; secret: string }>('social/' + provider + '/start', {});
      if (current !== attempt.current) return;
      if (popup) popup.location.href = start.url;
      else await WebBrowser.openBrowserAsync(start.url);
      for (let poll = 0; current === attempt.current && poll < 200; poll += 1) {
        const result = await authRequest<Session | { pending: true }>('social/result', { secret: start.secret });
        if (current !== attempt.current) return;
        if ('access' in result) { await auth.acceptSocialSession(result); return; }
        if (popup?.closed) throw new Error('Sign-in was canceled. Please try again.');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (current === attempt.current) throw new Error('Sign-in timed out. Please try again.');
    } catch (error) {
      if (current === attempt.current) setError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      popup?.close();
      if (current === attempt.current) { setBusy(false); setSocial(false); }
    }
  }
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (busy) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setError('');
    if (register && (!name.trim() || !hometown.trim() || password !== confirmation)) {
      setError(!name.trim() ? 'Enter a display name.' : !hometown.trim() ? 'Enter your hometown or area.' : 'Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      if (register) await auth.register(name.trim(), email.trim(), password, hometown.trim());
      else await auth.signIn(email.trim(), password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.brandMark}>
              <ThemedText style={styles.brandMarkText}>P</ThemedText>
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              {register ? 'Create your account' : 'Welcome back'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {register ? 'Join PTP and make room for your next journey.' : 'Sign in to continue to your personal space.'}
            </ThemedText>

            <View style={styles.form}>
              {(['google', 'apple'] as const).map(provider => <Pressable key={provider}
                accessibilityRole="button" disabled={busy} onPress={() => handleSocial(provider)}
                style={[styles.socialButton, { borderColor: theme.backgroundSelected }, busy && { opacity: 0.5 }]}>
                <ThemedText type="smallBold">Continue with {provider === 'google' ? 'Google' : 'Apple'}</ThemedText>
              </Pressable>)}
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>or {register ? 'sign up' : 'sign in'} with email</ThemedText>
              {social && <View style={styles.fieldGroup}>
                <ThemedText>Finish signing in in your browser, then return to PTP.</ThemedText>
                <Pressable accessibilityRole="button" onPress={() => { attempt.current += 1; setBusy(false); setSocial(false); }}>
                  <ThemedText type="linkPrimary">Cancel sign-in</ThemedText>
                </Pressable>
              </View>}
              {register && <View style={styles.fieldGroup}>
                <ThemedText type="smallBold">Display name</ThemedText>
                <TextInput accessibilityLabel="Display name" autoComplete="off" autoCapitalize="none" autoCorrect={false} value={name} onChangeText={setName}
                  maxLength={150} editable={!busy} placeholder="Username or nickname" placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} />
                <ThemedText themeColor="textSecondary">Use a username or nickname. Your real name is not required.</ThemedText>
              </View>}
              {register && <View style={styles.fieldGroup}>
                <ThemedText type="smallBold">Hometown or area</ThemedText>
                <TextInput accessibilityLabel="Hometown or area" value={hometown} onChangeText={setHometown}
                  maxLength={150} editable={!busy} autoCapitalize="words" placeholder="City or area, state / country"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} />
                <ThemedText themeColor="textSecondary">Where are you from? You can change this later.</ThemedText>
              </View>}
              <View style={styles.fieldGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  Email address
                </ThemedText>
                <TextInput
                  accessibilityLabel="Email address"
                  editable={!busy}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  onFocus={() => setError('')}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={email}
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  Password
                </ThemedText>
                <View style={styles.passwordRow}>
                  <TextInput
                    accessibilityLabel="Password"
                    editable={!busy}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={register ? 'new-password' : 'current-password'}
                    onChangeText={setPassword}
                    onFocus={() => setError('')}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    style={[styles.passwordInput, { color: theme.text }]}
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={8}
                    onPress={() => setShowPassword((visible) => !visible)}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {showPassword ? 'Hide' : 'Show'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {register && <View style={styles.fieldGroup}>
                <ThemedText themeColor="textSecondary">Use at least 8 characters and avoid common passwords.</ThemedText>
                <ThemedText type="smallBold">Confirm password</ThemedText>
                <TextInput accessibilityLabel="Confirm password" value={confirmation} onChangeText={setConfirmation}
                  editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="new-password"
                  secureTextEntry={!showPassword} placeholder="Re-enter your password" placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} />
              </View>}

              {error ? (
                <ThemedText style={styles.error} accessibilityRole="alert">
                  {error}
                </ThemedText>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                disabled={busy}
                style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}>
                <ThemedText style={styles.submitText}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.signupRow}>
              <ThemedText themeColor="textSecondary">{register ? 'Already a member? ' : 'New here? '}</ThemedText>
              <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.replace(register ? '/' : '/register')}>
                <ThemedText type="linkPrimary">{register ? 'Sign in' : 'Create an account'}</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  socialButton: { borderWidth: 1, borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  brandMark: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#D95D39',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    marginBottom: Spacing.four,
    width: 56,
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  fieldGroup: {
    gap: Spacing.three,
  },
  label: {
    marginLeft: Spacing.one,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    height: 56,
    paddingHorizontal: Spacing.three,
  },
  passwordRow: {
    alignItems: 'center',
    borderColor: '#D9DDE5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    height: 56,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.one,
  },
  error: {
    color: '#B42318',
    fontSize: 14,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#D95D39',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
  signupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.five,
  },
});
