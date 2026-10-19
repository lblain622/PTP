import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/hooks/use-theme';

export default function AccountScreen() {
  const { user, updateProfile, signOut } = useAuth();
  const theme = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [hometown, setHometown] = useState(user?.hometown || '');
  const onboarding = !user?.name || !user?.hometown;
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setMessage('');
    try { await action(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <ThemedView style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ThemedText themeColor="textSecondary">PTP / YOUR ACCOUNT</ThemedText>
      <ThemedText type="subtitle">{onboarding ? 'Make yourself at home' : `Welcome, ${user?.name}`} </ThemedText>
      <ThemedText themeColor="textSecondary">{onboarding ? 'Choose a display name and add your hometown to finish setting up your account.' : 'Your personal space for the journeys ahead.'}</ThemedText>
      <View style={[styles.card, { borderColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">Email address</ThemedText>
        <ThemedText>{user?.email}</ThemedText>
        <ThemedText type="smallBold">Display name</ThemedText>
        <TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} editable={!busy}
          autoComplete="off" autoCapitalize="none" autoCorrect={false} maxLength={150} placeholder="Username or nickname" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} />
        <ThemedText themeColor="textSecondary">Use a username or nickname. Your real name is not required.</ThemedText>
        <ThemedText type="smallBold">Hometown or area</ThemedText>
        <TextInput accessibilityLabel="Hometown or area" value={hometown} onChangeText={setHometown} editable={!busy}
          maxLength={150} autoCapitalize="words" placeholder="City or area, state / country" placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]} />
        <ThemedText themeColor="textSecondary">Choose the place you call home. You can update it anytime.</ThemedText>
        <Pressable accessibilityRole="button" disabled={busy || !name.trim() || !hometown.trim()} style={styles.button}
          onPress={() => run(() => updateProfile(name.trim(), hometown.trim()), 'Your account has been updated.')}>
          <ThemedText style={styles.buttonText}>{busy ? 'Please wait…' : onboarding ? 'Finish setup' : 'Save changes'}</ThemedText>
        </Pressable>
      </View>
      {message ? <ThemedText accessibilityRole="alert">{message}</ThemedText> : null}
      <Pressable accessibilityRole="button" disabled={busy} style={styles.signOut} onPress={() => run(signOut, '')}>
        <ThemedText type="linkPrimary">Sign out</ThemedText>
      </Pressable>
    </ScrollView>
  </SafeAreaView></ThemedView>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, gap: 20, justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  button: { backgroundColor: '#D95D39', padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  signOut: { alignSelf: 'center', padding: 16 },
});
