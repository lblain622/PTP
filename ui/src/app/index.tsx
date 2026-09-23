import { useEffect, useState } from 'react';
import { AppState, Button, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type Report = { id: string; category: string; description: string };

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [feedStatus, setFeedStatus] = useState('Loading reports...');

  async function refreshReports() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('safety_reports')
        .select('id,category,description').eq('status', 'published')
        .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20);
      if (error) {
        setReports([]);
        setFeedStatus(error.code === 'PGRST205'
          ? 'The report database is being set up. Please try again later.'
          : 'Reports are unavailable. Please try again.');
      } else {
        setReports(data ?? []);
        setFeedStatus(data?.length ? '' : 'No published reports yet.');
      }
    } catch { setFeedStatus('Unable to connect. Check your connection and try again.'); }
  }

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (active) setSession(next);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!authEventReceived) setSession(data.session);
      if (error) setMessage('Could not restore your session. Please sign in again.');
    }).catch(() => { if (active) setMessage('Could not restore your session.'); });
    if (Platform.OS !== 'web' && AppState.currentState === 'active') client.auth.startAutoRefresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') {
        if (state === 'active') client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      }
    });
    // Fetch results update state asynchronously; initial loading state is set above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshReports();
    return () => { active = false; subscription.unsubscribe(); listener.remove(); client.auth.stopAutoRefresh(); };
  }, []);

  async function authenticate(signUp: boolean) {
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    try {
      const credentials = { email: email.trim(), password };
      const { data, error } = signUp
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (error) setMessage(error.message);
      else {
        setPassword('');
        setMessage(signUp && !data.session ? 'Check your email to confirm your account, then sign in.' : 'Signed in.');
      }
    } catch { setMessage('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      setMessage(error ? 'Sign out failed. Please try again.' : 'Signed out.');
    } catch { setMessage('Sign out failed. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>PTP</Text>
        <Text>Community travel updates</Text>
        <Text>Community reports do not guarantee safety. For emergencies, contact local emergency services.</Text>
        {!supabase ? <Text>Connection setup is incomplete. Configure a public Supabase URL and key, then restart the app.</Text> : <>
          <View style={styles.card}>
            <Text style={styles.heading}>Your account</Text>
            {session ? <>
              <Text>Signed in as {session.user.email}</Text>
              <Button title="Sign out" disabled={busy} onPress={() => void signOut()} />
            </> : <>
              <TextInput style={styles.input} accessibilityLabel="Email" placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} accessibilityLabel="Password" placeholder="Password" autoCapitalize="none" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} />
              <Button title="Sign in" disabled={busy || !email.trim() || !password} onPress={() => void authenticate(false)} />
              <Button title="Create account" disabled={busy || !email.trim() || !password} onPress={() => void authenticate(true)} />
            </>}
            {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.heading}>Published updates</Text>
            {feedStatus ? <Text accessibilityLiveRegion="polite">{feedStatus}</Text> : null}
            {reports.map((report) => <View key={report.id} style={styles.report}>
              <Text style={styles.heading}>{report.category.replaceAll('_', ' ')}</Text>
              <Text>{report.description}</Text>
            </View>)}
            <Button title="Refresh updates" onPress={() => { setFeedStatus('Loading reports...'); void refreshReports(); }} />
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 24, paddingBottom: 100, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 36, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, gap: 12 },
  input: { borderWidth: 1, borderColor: '#687787', borderRadius: 8, padding: 12, color: '#18212b' },
  report: { borderTopWidth: 1, borderColor: '#dde2e8', paddingTop: 12, gap: 8 },
});
