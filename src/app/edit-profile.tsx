import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, PageHeader, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSnackbar } from '@/context/snackbar';
import { customerApi, errorMessage } from '@/lib/api';
import { color, space } from '@/theme/tokens';

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const snackbar = useSnackbar();
  const [name, setName] = useState(String(user?.name || ''));
  const [email, setEmail] = useState(String(user?.email || ''));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return snackbar('Name is required', 'error');
    setSaving(true);
    try {
      await customerApi.updateProfile({ name: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) });
      await refreshUser();
      snackbar('Profile updated', 'success');
      router.back();
    } catch (e) {
      snackbar(errorMessage(e, 'Could not update profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="Edit profile" />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TextField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
        <TextField label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <TextField label="Mobile number" value={String(user?.phone || '')} editable={false} style={{ opacity: 0.6 }} />
        <Button label="Save changes" onPress={save} loading={saving} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  form: { padding: space.xl, gap: space.lg },
});
