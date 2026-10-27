import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Platform, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { apiErrorMessage, calculateEmi, formatINR, formatPriceShort, inquirySchema, titleCase, zodFieldErrors } from '@propertyhub/shared';
import { api, SITE_URL } from '../api';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import ShowContact from '../components/ShowContact';
import PropertyCard, { FavoriteButton } from '../components/PropertyCard';
import OsmMap from '../components/OsmMap';
import { Button, Card, Chip, ErrorState, Skeleton, StatusPill, Txt } from '../components/ui';

const { width } = Dimensions.get('window');

function Gallery({ images }) {
  const [i, setI] = useState(0);
  const { colors } = useTheme();
  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(img) => img.url}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <Image source={{ uri: item.url }} style={{ width, height: 280, backgroundColor: colors.skeleton }} contentFit="cover" transition={200} />}
      />
      <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
        <Txt size={12} style={{ color: '#fff' }}>{i + 1} / {images.length}</Txt>
      </View>
    </View>
  );
}

export function EmiBox({ price }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loan, setLoan] = useState(String(Math.round(price * 0.8)));
  const [rate, setRate] = useState('8.5');
  const [years, setYears] = useState('20');
  const r = calculateEmi(Number(loan), Number(rate), Number(years));
  const field = (label, value, set) => (
    <View style={{ flex: 1 }}>
      <Txt muted size={12}>{label}</Txt>
      <TextInput value={value} onChangeText={(v) => set(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, marginTop: 4 }} />
    </View>
  );
  return (
    <View>
      {field(`${t('loanAmount')} (₹)`, loan, setLoan)}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        {field(t('interestRate'), rate, setRate)}
        {field(t('tenure'), years, setYears)}
      </View>
      <View style={{ backgroundColor: colors.brand, borderRadius: 14, padding: 16, marginTop: 14 }}>
        <Txt size={13} style={{ color: '#adc6e6' }}>{t('monthlyEmi')}</Txt>
        <Txt bold size={26} style={{ color: '#fff' }}>{formatINR(r.emi)}</Txt>
        <Txt size={13} style={{ color: '#d6e3f3', marginTop: 4 }}>{t('totalInterest')}: {formatINR(r.totalInterest)} · {t('totalPayment')}: {formatINR(r.totalPayment)}</Txt>
      </View>
    </View>
  );
}

function InquiryBox({ property, navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [msg, setMsg] = useState(`Hi, I'm interested in "${property.title}". Is it still available?`);
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: api.inquiries.create,
    onSuccess: (inq) => {
      Alert.alert('✅', 'Inquiry sent! Replies appear in Inquiries.', [{ text: 'Open chat', onPress: () => navigation.navigate('Chat', { id: inq._id }) }, { text: 'OK' }]);
    },
    onError: (e) => Alert.alert(t('errorGeneric'), apiErrorMessage(e)),
  });
  const send = () => {
    if (!user) return navigation.navigate('Login');
    const r = inquirySchema.safeParse({ propertyId: property._id, message: msg });
    if (!r.success) return setErr(zodFieldErrors(r.error).message);
    setErr('');
    m.mutate(r.data);
  };
  return (
    <View>
      <TextInput value={msg} onChangeText={setMsg} multiline maxLength={1000} style={{ borderWidth: 1, borderColor: err ? colors.danger : colors.border, borderRadius: 12, padding: 12, minHeight: 80, color: colors.text, textAlignVertical: 'top' }} />
      {err ? <Txt size={12} style={{ color: colors.danger }}>{err}</Txt> : null}
      <Button title={t('sendInquiry')} variant="dark" loading={m.isPending} onPress={send} style={{ marginTop: 10 }} />
    </View>
  );
}

function VisitBox({ property, navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date(Date.now() + 86400000));
  const [show, setShow] = useState(false);
  const [slot, setSlot] = useState('morning');
  const m = useMutation({
    mutationFn: api.visits.create,
    onSuccess: () => Alert.alert('✅', 'Visit requested. You will be notified when the owner confirms.'),
    onError: (e) => Alert.alert(t('errorGeneric'), apiErrorMessage(e)),
  });
  return (
    <View>
      <Pressable onPress={() => setShow(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Ionicons name="calendar-outline" size={18} color="#059669" />
        <Txt bold>{date.toDateString()}</Txt>
        <Txt muted size={13}>(tap to change)</Txt>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date(Date.now() + 86400000)}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(e, d) => {
            setShow(Platform.OS === 'ios');
            if (d) setDate(d);
          }}
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {['morning', 'afternoon', 'evening'].map((s) => <Chip key={s} label={t(s)} active={slot === s} onPress={() => setSlot(s)} />)}
      </View>
      <Button
        title={t('requestVisit')}
        variant="outline"
        icon="calendar"
        loading={m.isPending}
        onPress={() => (user ? m.mutate({ propertyId: property._id, date: date.toISOString().slice(0, 10), slot }) : navigation.navigate('Login'))}
      />
    </View>
  );
}

export default function PropertyDetailScreen({ route, navigation }) {
  const { slug } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['property', slug], queryFn: () => api.properties.get(slug) });
  const p = q.data;
  const similar = useQuery({ queryKey: ['similar', p?._id], queryFn: () => api.properties.similar(p._id), enabled: Boolean(p?._id) });

  useLayoutEffect(() => {
    if (!p) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Pressable
            hitSlop={10}
            accessibilityLabel={t('share')}
            onPress={() => Share.share({ message: `${p.title} – ${formatPriceShort(p.price)}\n${SITE_URL}/property/${p.slug}` })}
          >
            <Ionicons name="share-social-outline" size={22} color={colors.text} />
          </Pressable>
          <FavoriteButton id={p._id} style={{ width: 32, height: 32 }} />
        </View>
      ),
    });
  }, [navigation, p, colors.text, t]);

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Skeleton height={280} radius={0} />
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton width="50%" height={26} />
          <Skeleton width="90%" />
          <Skeleton width="70%" />
        </View>
      </View>
    );
  }
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;

  const facts = [
    p.bedrooms > 0 && [t('bedrooms'), p.bedrooms],
    p.bathrooms > 0 && [t('bathrooms'), p.bathrooms],
    [t('area'), `${p.areaSqft.toLocaleString('en-IN')} ${t('sqft')}`],
    [t('furnishing'), titleCase(p.furnishing)],
    [t('type'), titleCase(p.type)],
    [t('views'), p.views],
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Gallery images={p.images} />
        <View style={{ padding: 16, gap: 16 }}>
          {p.status !== 'approved' ? <StatusPill status={p.status} /> : null}
          <View>
            <Txt bold size={26}>
              {formatPriceShort(p.price)}
              {p.purpose === 'rent' ? <Txt muted size={14}>{t('perMonth')}</Txt> : null}
            </Txt>
            {p.previousPrice > p.price ? <Txt size={13} style={{ color: colors.danger }}>Price dropped from {formatINR(p.previousPrice)}</Txt> : null}
            <Txt bold size={18} style={{ marginTop: 6 }}>{p.title}</Txt>
            <Txt muted style={{ marginTop: 4 }}>📍 {p.address.line}, {p.address.locality}, {p.address.city} {p.address.pincode}</Txt>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {facts.map(([label, value]) => (
              <Card key={label} style={{ width: (width - 52) / 3, padding: 12 }}>
                <Txt muted size={11}>{label}</Txt>
                <Txt bold size={14}>{value}</Txt>
              </Card>
            ))}
          </View>

          <Card>
            <Pressable onPress={() => navigation.navigate('AgentProfile', { id: p.owner._id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Txt bold style={{ color: '#fff' }}>{p.owner.name?.[0]}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt bold>{p.owner.name}</Txt>
                <Txt muted size={12}>Owner / Agent · {p.contact?.masked ? p.contact.phone : t('contactDetails')}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
            <ShowContact property={p} />
            {p.isOwner ? <Button title={t('edit')} variant="outline" style={{ marginTop: 10 }} onPress={() => navigation.navigate('PostProperty', { id: p._id })} /> : null}
          </Card>

          <View>
            <Txt bold size={17} style={{ marginBottom: 6 }}>{t('description')}</Txt>
            <Txt muted style={{ lineHeight: 22 }}>{p.description}</Txt>
          </View>

          {p.amenities?.length ? (
            <View>
              <Txt bold size={17} style={{ marginBottom: 8 }}>{t('amenities')}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {p.amenities.map((a) => <Chip key={a} label={`✓ ${titleCase(a)}`} />)}
              </View>
            </View>
          ) : null}

          <View>
            <Txt bold size={17} style={{ marginBottom: 8 }}>{t('location')}</Txt>
            <OsmMap properties={[p]} style={{ height: 220, borderRadius: 14 }} />
          </View>

          {!p.isOwner && p.status === 'approved' ? (
            <>
              <Card>
                <Txt bold size={16} style={{ marginBottom: 10 }}>{t('sendInquiry')}</Txt>
                <InquiryBox property={p} navigation={navigation} />
              </Card>
              <Card>
                <Txt bold size={16} style={{ marginBottom: 10 }}>{t('requestVisit')}</Txt>
                <VisitBox property={p} navigation={navigation} />
              </Card>
            </>
          ) : null}

          {p.purpose === 'sale' ? (
            <Card>
              <Txt bold size={16} style={{ marginBottom: 10 }}>{t('emiCalculator')}</Txt>
              <EmiBox price={p.price} />
            </Card>
          ) : null}

          {similar.data?.length ? (
            <View>
              <Txt bold size={17} style={{ marginBottom: 10 }}>{t('similar')}</Txt>
              {similar.data.slice(0, 3).map((s) => <PropertyCard key={s._id} p={s} compact />)}
            </View>
          ) : similar.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
