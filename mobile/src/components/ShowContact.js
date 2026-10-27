import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiErrorCode, apiErrorMessage, formatINR, whatsappLink } from '@propertyhub/shared';
import { api } from '../api';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useBalance, usePurchase } from '../hooks';
import { Button, Card, Sheet, Txt } from './ui';

export function ContactActions({ contact, title }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {contact.name ? <Txt muted>{contact.name}</Txt> : null}
      <Button title={`${t('call')}  ${contact.phone}`} icon="call" variant="dark" onPress={() => Linking.openURL(`tel:${contact.phone}`)} />
      <Button title={t('whatsapp')} icon="logo-whatsapp" variant="whatsapp" onPress={() => Linking.openURL(whatsappLink(contact.whatsapp, `Hi, I'm interested in "${title}" on PropertyHub`))} />
      {contact.email ? <Button title={contact.email} icon="mail-outline" variant="outline" onPress={() => Linking.openURL(`mailto:${contact.email}`)} /> : null}
      <Txt muted size={12} style={{ textAlign: 'center', color: colors.muted }}>{t('paywallBenefit2')}</Txt>
    </View>
  );
}

export function Paywall({ onDone }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const plans = useQuery({ queryKey: ['plans'], queryFn: api.payments.plans });
  const purchase = usePurchase();
  const [promo, setPromo] = useState('');
  const plan = plans.data?.[0];
  if (plans.isLoading) return <ActivityIndicator style={{ margin: 30 }} color={colors.accent} />;
  if (!plan) return <Txt muted>No plans available right now.</Txt>;

  const pay = async () => {
    const s = await purchase.buy(plan._id, promo);
    if (s === 'success') {
      Alert.alert('Payment received', t('paymentSuccess'));
      onDone?.(s);
    } else if (s === 'pending') {
      Alert.alert('Payment pending', t('paymentPending'));
      onDone?.(s);
    }
  };

  return (
    <View>
      <View style={{ backgroundColor: colors.brand, borderRadius: 16, padding: 18 }}>
        <Txt size={13} style={{ color: '#adc6e6' }}>{plan.name}</Txt>
        <Txt bold size={30} style={{ color: '#fff' }}>{formatINR(plan.price)}</Txt>
        <Txt size={13} style={{ color: '#d6e3f3' }}>
          {plan.credits} credits · {formatINR(plan.price / plan.credits, { decimals: 2 })}/contact · {Math.round(plan.validityDays / 30)} months
        </Txt>
        <Txt size={11} style={{ color: '#adc6e6', marginTop: 2 }}>Inclusive of 18% GST</Txt>
      </View>
      <View style={{ marginVertical: 14, gap: 8 }}>
        {[t('paywallBenefit1'), t('paywallBenefit2'), t('paywallBenefit3')].map((b) => (
          <View key={b} style={{ flexDirection: 'row', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            <Txt size={14} style={{ flex: 1 }}>{b}</Txt>
          </View>
        ))}
      </View>
      <TextInput
        value={promo}
        onChangeText={(v) => setPromo(v.toUpperCase())}
        placeholder="Promo code (optional)"
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text, marginBottom: 12 }}
      />
      <Button title={purchase.status === 'verifying' ? 'Confirming payment…' : t('payNow', { amount: plan.price })} icon="lock-closed" loading={purchase.busy} onPress={pay} />
      {purchase.status === 'failed' && purchase.error ? <Txt size={13} style={{ color: colors.danger, textAlign: 'center', marginTop: 8 }}>{purchase.error}</Txt> : null}
      {purchase.status === 'cancelled' ? <Txt muted size={13} style={{ textAlign: 'center', marginTop: 8 }}>Payment cancelled. You were not charged.</Txt> : null}
      <Txt muted size={11} style={{ textAlign: 'center', marginTop: 10 }}>Secured by Razorpay · UPI, cards, netbanking, wallets</Txt>
    </View>
  );
}

/** Masked contact -> login / confirm / paywall -> reveal. Real details only ever come from the API. */
export default function ShowContact({ property, small }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const nav = useNavigation();
  const qc = useQueryClient();
  const { data: balance } = useBalance();
  const [sheet, setSheet] = useState(null);
  const [contact, setContact] = useState(property.contactUnlocked && !property.contact?.masked ? property.contact : null);

  const unlock = useMutation({
    mutationFn: () => api.properties.unlockContact(property._id),
    onSuccess: (d) => {
      setContact(d.contact);
      qc.setQueryData(['balance'], d.balance);
      qc.invalidateQueries({ queryKey: ['property', property.slug] });
      qc.invalidateQueries({ queryKey: ['unlocked'] });
      setSheet('revealed');
    },
    onError: (e) => {
      if (apiErrorCode(e) === 'NO_CREDITS') setSheet('paywall');
      else {
        setSheet(null);
        Alert.alert(t('errorGeneric'), apiErrorMessage(e));
      }
    },
  });

  if (property.isOwner) {
    return <Card style={{ padding: 10, alignItems: 'center' }}><Txt muted size={13}>{t('ownContact')}</Txt></Card>;
  }

  const onPress = () => {
    if (!user) return nav.navigate('Login', { reason: 'login_required' });
    if (contact) return setSheet('revealed');
    if (property.contactUnlocked) return unlock.mutate();
    if (balance && balance.total <= 0) return setSheet('paywall');
    setSheet('confirm');
  };

  return (
    <>
      <Button
        title={contact || property.contactUnlocked ? t('contactDetails') : `${t('showContact')}${small ? '' : `  ${property.contact?.phone || ''}`}`}
        icon="call-outline"
        onPress={onPress}
        loading={unlock.isPending}
        small={small}
        // Quiet outline on cards; solid primary on the detail page.
        variant={small ? 'outline' : 'primary'}
      />
      <Sheet visible={sheet === 'confirm'} onClose={() => setSheet(null)} title={t('useCreditTitle')}>
        <View style={{ backgroundColor: colors.accentSoft, padding: 14, borderRadius: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Ionicons name="wallet-outline" size={22} color={colors.accent} />
          <Txt bold style={{ flex: 1, color: colors.accent }}>{t('useCreditText', { count: balance?.total ?? 0 })}</Txt>
        </View>
        <Txt muted size={12} style={{ marginVertical: 12 }}>{t('creditsLeft', { free: balance?.free ?? 0, paid: balance?.paid ?? 0 })}</Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={t('cancel')} variant="outline" onPress={() => setSheet(null)} style={{ flex: 1 }} />
          <Button title={t('confirm')} onPress={() => unlock.mutate()} loading={unlock.isPending} style={{ flex: 1 }} />
        </View>
      </Sheet>
      <Sheet visible={sheet === 'paywall'} onClose={() => setSheet(null)} title={t('noCreditsTitle')}>
        <Paywall onDone={(s) => setSheet(s === 'success' ? 'confirm' : null)} />
      </Sheet>
      <Sheet visible={sheet === 'revealed' && Boolean(contact)} onClose={() => setSheet(null)} title={t('contactDetails')}>
        {contact ? <ContactActions contact={contact} title={property.title} /> : null}
        {balance ? <Txt muted size={12} style={{ textAlign: 'center', marginTop: 10 }}>{t('creditsLeft', { free: balance.free, paid: balance.paid })}</Txt> : null}
      </Sheet>
    </>
  );
}
