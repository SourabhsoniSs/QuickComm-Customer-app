import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button, HeaderGradient, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSnackbar } from '@/context/snackbar';
import { customerApi, errorMessage } from '@/lib/api';
import { color, font, shape, space, type } from '@/theme/tokens';

/** Phone + OTP login / sign-up (website CustomerAuth). */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const snackbar = useSnackbar();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const sendOtp = async () => {
    if (phone.length !== 10) return snackbar('Enter a valid 10-digit number', 'error');
    if (!isLogin && !name.trim()) return snackbar('Enter your name', 'error');
    setLoading(true);
    try {
      if (isLogin) await customerApi.sendLoginOtp({ phone });
      else await customerApi.sendSignupOtp({ name: name.trim(), phone });
      setOtpSent(true);
      setTimer(30);
      snackbar('OTP sent!', 'success');
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e) {
      snackbar(errorMessage(e, 'Failed to send OTP'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (otp.length !== 4) return snackbar('Enter the 4-digit code', 'error');
    setLoading(true);
    try {
      const res = await customerApi.verifyOtp({ phone, otp });
      const { token, customer } = res.data.result;
      await login(token, { ...customer, role: 'customer' });
      // The Stack.Protected guard removes this screen, returning to where we were.
      snackbar('Successfully logged in!', 'success');
    } catch (e) {
      snackbar(errorMessage(e, 'Invalid OTP'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <HeaderGradient style={[styles.hero, { paddingTop: insets.top + space.lg }]}>
          <Pressable accessibilityLabel="Close" style={styles.close} onPress={() => router.back()}>
            <Icon name="close" size={22} color={color.onHeader} />
          </Pressable>
          <Image source={require('@/assets/images/atoz-logo.webp')} style={styles.logo} contentFit="cover" />
          <Text style={styles.brand}>
            A<Text style={styles.brandTo}> to </Text>Z<Text style={styles.brandGrocery}> Grocery</Text>
          </Text>
          <Text style={styles.tagline}>Groceries delivered in minutes</Text>
        </HeaderGradient>

        <View style={[styles.card, { paddingBottom: insets.bottom + space.xxl }]}>
          <Text style={styles.title}>{otpSent ? 'Verify OTP' : isLogin ? 'Log in' : 'Create account'}</Text>
          <Text style={styles.subtitle}>
            {otpSent ? `Enter the 4-digit code sent to +91 ${phone}` : 'We’ll send a one-time code to your phone.'}
          </Text>

          {!otpSent ? (
            <View style={styles.form}>
              {!isLogin ? <TextField label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" /> : null}
              <View style={styles.phoneRow}>
                <View style={styles.cc}>
                  <Text style={styles.ccText}>+91</Text>
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Mobile number"
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    placeholder="10-digit number"
                    maxLength={10}
                  />
                </View>
              </View>
              <Button label="Get OTP" onPress={sendOtp} loading={loading} disabled={phone.length !== 10} />
              <Pressable accessibilityRole="button" style={styles.switch} onPress={() => setIsLogin((v) => !v)}>
                <Text style={styles.switchText}>
                  {isLogin ? 'New here? ' : 'Already have an account? '}
                  <Text style={styles.switchLink}>{isLogin ? 'Create an account' : 'Log in'}</Text>
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                ref={otpRef}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={4}
                style={styles.otp}
                accessibilityLabel="One-time code"
                placeholder="• • • •"
                placeholderTextColor={color.outline}
              />
              <Button label="Verify & continue" onPress={verify} loading={loading} disabled={otp.length !== 4} />
              <View style={styles.resendRow}>
                <Pressable onPress={() => { setOtpSent(false); setOtp(''); }}>
                  <Text style={styles.switchLink}>Change number</Text>
                </Pressable>
                <Pressable disabled={timer > 0 || loading} onPress={sendOtp}>
                  <Text style={[styles.switchLink, timer > 0 && { color: color.onSurfaceVariant }]}>
                    {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1 },
  hero: { alignItems: 'center', paddingBottom: 48, paddingHorizontal: space.xl },
  close: { position: 'absolute', right: space.md, top: 40, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fbfaf6', marginTop: space.xl },
  brand: { fontFamily: font.display, fontSize: 28, letterSpacing: -0.8, color: '#fffef3', marginTop: space.md },
  brandTo: { fontFamily: font.bodySemi, fontSize: 15, color: '#dff0cc' },
  brandGrocery: { fontFamily: font.bodySemi, fontSize: 20, color: '#e6f3d9' },
  tagline: { ...type.bodyMedium, color: color.onHeaderMuted, marginTop: 4 },
  card: {
    flex: 1,
    marginTop: -24,
    backgroundColor: color.surface,
    borderTopLeftRadius: shape.extraLarge,
    borderTopRightRadius: shape.extraLarge,
    padding: space.xxl,
  },
  title: { ...type.headlineSmall, color: color.onSurface },
  subtitle: { ...type.bodyMedium, color: color.onSurfaceVariant, marginTop: 4 },
  form: { gap: space.lg, marginTop: space.xxl },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  cc: {
    height: 52,
    paddingHorizontal: space.md,
    borderRadius: shape.small,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    justifyContent: 'center',
    backgroundColor: color.surfaceContainer,
  },
  ccText: { ...type.labelLarge, color: color.onSurface },
  switch: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  switchText: { ...type.bodyMedium, color: color.onSurfaceVariant },
  switchLink: { fontFamily: font.bodyBold, fontSize: 14, color: color.primary },
  otp: {
    height: 64,
    borderRadius: shape.medium,
    borderWidth: 2,
    borderColor: color.primary,
    textAlign: 'center',
    fontFamily: font.display,
    fontSize: 28,
    letterSpacing: 16,
    color: color.onSurface,
    backgroundColor: '#ffffff',
  },
  resendRow: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center' },
});
