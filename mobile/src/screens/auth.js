import { useRef, useState } from 'react';
import { Dimensions, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  apiErrorMessage,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  zodFieldErrors,
} from '@propertyhub/shared';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { Button, Input, Txt } from '../components/ui';

const { width } = Dimensions.get('window');

export function OnboardingScreen({ onDone }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [i, setI] = useState(0);
  const list = useRef(null);
  const slides = [
    { icon: 'search', title: t('onb1Title'), text: t('onb1Text') },
    { icon: 'call', title: t('onb2Title'), text: t('onb2Text') },
    { icon: 'home', title: t('onb3Title'), text: t('onb3Text') },
  ];
  const next = () => (i < slides.length - 1 ? list.current?.scrollToIndex({ index: i + 1 }) : onDone());
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.brand }}>
      <Pressable onPress={onDone} style={{ alignSelf: 'flex-end', padding: 16 }}>
        <Txt style={{ color: '#d6e3f3' }}>{t('skip')}</Txt>
      </Pressable>
      <FlatList
        ref={list}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.icon}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', padding: 36, borderRadius: 999, marginBottom: 32 }}>
              <Ionicons name={item.icon} size={72} color="#10b981" />
            </View>
            <Txt bold size={28} style={{ color: '#fff', textAlign: 'center' }}>{item.title}</Txt>
            <Txt size={16} style={{ color: '#d6e3f3', textAlign: 'center', marginTop: 12 }}>{item.text}</Txt>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {slides.map((s, k) => (
          <View key={s.icon} style={{ width: k === i ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
        ))}
      </View>
      <Button title={i === slides.length - 1 ? t('getStarted') : t('next')} onPress={next} style={{ marginHorizontal: 24, marginBottom: 24 }} />
    </SafeAreaView>
  );
}

function Form({ children }) {
  const { colors } = useTheme();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ErrorBox({ text }) {
  const { colors } = useTheme();
  if (!text) return null;
  return (
    <View style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 12, marginBottom: 14 }}>
      <Txt size={14} style={{ color: colors.danger }}>{text}</Txt>
    </View>
  );
}

export function LoginScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [f, setF] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const r = loginSchema.safeParse(f);
    if (!r.success) return setErrs(zodFieldErrors(r.error));
    setErrs({});
    setError('');
    setBusy(true);
    try {
      await signIn(await api.auth.login(r.data));
      navigation.goBack();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form>
      <Txt bold size={26}>{t('welcomeBack')}</Txt>
      {route.params?.reason ? <Txt muted style={{ marginTop: 4 }}>{t(route.params.reason)}</Txt> : null}
      <View style={{ height: 20 }} />
      <ErrorBox text={error} />
      <Input label={t('email')} value={f.email} onChangeText={(email) => setF({ ...f, email })} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errs.email} />
      <Input label={t('password')} value={f.password} onChangeText={(password) => setF({ ...f, password })} secureTextEntry autoComplete="password" error={errs.password} />
      <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
        <Txt bold size={14} style={{ color: '#059669' }}>{t('forgotPassword')}</Txt>
      </Pressable>
      <Button title={t('login')} onPress={submit} loading={busy} />
      <Pressable onPress={() => navigation.replace('Register')} style={{ marginTop: 20, alignItems: 'center' }}>
        <Txt muted>{t('noAccount')} <Txt bold style={{ color: '#059669' }}>{t('register')}</Txt></Txt>
      </Pressable>
    </Form>
  );
}

export function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', role: 'buyer' });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const r = registerSchema.safeParse(f);
    if (!r.success) return setErrs(zodFieldErrors(r.error));
    setErrs({});
    setError('');
    setBusy(true);
    try {
      await signIn(await api.auth.register(r.data));
      navigation.goBack();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form>
      <Txt bold size={26}>{t('createAccount')}</Txt>
      <View style={{ backgroundColor: colors.accentSoft, padding: 12, borderRadius: 12, marginVertical: 16, flexDirection: 'row', gap: 8 }}>
        <Ionicons name="gift-outline" size={20} color={colors.accent} />
        <Txt style={{ color: colors.accent, flex: 1 }}>Sign up and get 7 free owner contacts.</Txt>
      </View>
      <ErrorBox text={error} />
      <Input label={t('name')} value={f.name} onChangeText={(name) => setF({ ...f, name })} autoComplete="name" error={errs.name} />
      <Input label={t('email')} value={f.email} onChangeText={(email) => setF({ ...f, email })} autoCapitalize="none" keyboardType="email-address" error={errs.email} />
      <Input label={`${t('phone')} (+91)`} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v.replace(/\D/g, '') })} keyboardType="phone-pad" maxLength={10} error={errs.phone} />
      <Input label={t('password')} value={f.password} onChangeText={(password) => setF({ ...f, password })} secureTextEntry error={errs.password} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Switch value={f.role === 'agent'} onValueChange={(v) => setF({ ...f, role: v ? 'agent' : 'buyer' })} trackColor={{ true: colors.accent }} />
        <Txt size={14} style={{ flex: 1 }}>{t('iAmAgent')}</Txt>
      </View>
      <Button title={t('register')} onPress={submit} loading={busy} />
      <Pressable onPress={() => navigation.replace('Login')} style={{ marginTop: 20, alignItems: 'center' }}>
        <Txt muted>{t('haveAccount')} <Txt bold style={{ color: '#059669' }}>{t('login')}</Txt></Txt>
      </Pressable>
    </Form>
  );
}

export function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ email: '', otp: '', password: '' });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (schema, fn) => {
    const r = schema.safeParse(f);
    if (!r.success) return setErrs(zodFieldErrors(r.error));
    setErrs({});
    setError('');
    setBusy(true);
    try {
      await fn(r.data);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form>
      <Txt muted style={{ marginBottom: 16 }}>{step === 1 ? 'We will email you a 6-digit code.' : `Enter the code sent to ${f.email}`}</Txt>
      <ErrorBox text={error} />
      {step === 1 ? (
        <>
          <Input label={t('email')} value={f.email} onChangeText={(email) => setF({ ...f, email })} autoCapitalize="none" keyboardType="email-address" error={errs.email} />
          <Button title={t('sendOtp')} loading={busy} onPress={() => run(forgotPasswordSchema, async (d) => { await api.auth.forgotPassword(d); setStep(2); })} />
        </>
      ) : (
        <>
          <Input label={t('otp')} value={f.otp} onChangeText={(v) => setF({ ...f, otp: v.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={6} error={errs.otp} />
          <Input label="New password" value={f.password} onChangeText={(password) => setF({ ...f, password })} secureTextEntry error={errs.password} />
          <Button
            title={t('resetPassword')}
            loading={busy}
            onPress={() => run(resetPasswordSchema, async (d) => { await api.auth.resetPassword(d); navigation.replace('Login'); })}
          />
        </>
      )}
    </Form>
  );
}
