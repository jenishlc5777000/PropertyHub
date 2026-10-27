import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AMENITIES, CITIES, FURNISHING, MAX_IMAGES, PROPERTY_TYPES, apiErrorMessage, formatINR, propertySchema, titleCase, zodFieldErrors } from '@propertyhub/shared';
import { api } from '../api';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import OsmMap from '../components/OsmMap';
import { Button, Chip, EmptyState, ErrorState, Input, ListSkeleton, Txt } from '../components/ui';

const STEPS = ['Basics', 'Location', 'Details', 'Photos'];
const STEP_FIELDS = [
  ['title', 'type', 'purpose', 'price', 'areaSqft', 'bedrooms', 'bathrooms', 'furnishing'],
  ['address', 'lat', 'lng'],
  ['description', 'amenities', 'contactPhone', 'contactWhatsapp', 'contactEmail'],
  [],
];
const empty = {
  title: '', type: 'apartment', purpose: 'sale', price: '', areaSqft: '', bedrooms: '2', bathrooms: '2', furnishing: 'semi-furnished',
  address: { line: '', locality: '', city: '', state: '', pincode: '' }, lat: null, lng: null,
  description: '', amenities: [], contactPhone: '', contactWhatsapp: '', contactEmail: '',
};

function BecomeAgent() {
  const { setUser } = useAuth();
  const m = useMutation({ mutationFn: api.users.becomeAgent, onSuccess: setUser, onError: (e) => Alert.alert('Error', apiErrorMessage(e)) });
  return (
    <EmptyState
      icon="business-outline"
      title="List your property for free"
      text="Switch your account to Owner / Agent to post listings and receive leads."
      action={<Button title="I'm an owner / agent" onPress={() => m.mutate()} loading={m.isPending} />}
    />
  );
}

export default function PostPropertyScreen({ route, navigation }) {
  const id = route.params?.id;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const [newImages, setNewImages] = useState([]);
  const [existing, setExisting] = useState([]);
  const [removed, setRemoved] = useState([]);

  const editing = useQuery({ queryKey: ['property', id], queryFn: () => api.properties.get(id), enabled: Boolean(id) });
  useEffect(() => {
    const p = editing.data;
    if (!p) return;
    setF({
      title: p.title, type: p.type, purpose: p.purpose, price: String(p.price), areaSqft: String(p.areaSqft), bedrooms: String(p.bedrooms), bathrooms: String(p.bathrooms),
      furnishing: p.furnishing, address: { ...empty.address, ...p.address }, lat: p.lat, lng: p.lng, description: p.description, amenities: p.amenities || [],
      contactPhone: p.contact?.phone || '', contactWhatsapp: p.contact?.whatsapp || '', contactEmail: p.contact?.email || '',
    });
    setExisting(p.images || []);
  }, [editing.data]);

  const save = useMutation({
    mutationFn: (fd) => (id ? api.properties.update(id, fd) : api.properties.create(fd)),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['myListings'] });
      qc.invalidateQueries({ queryKey: ['property'] });
      Alert.alert('✅', p.status === 'pending' ? 'Submitted! Your listing goes live after a quick review.' : 'Listing saved.');
      navigation.replace('MyListings');
    },
    onError: (e) => {
      if (e.response?.data?.error?.details) setErrs(e.response.data.error.details);
      Alert.alert(t('errorGeneric'), apiErrorMessage(e));
    },
  });

  if (!user) return <EmptyState icon="log-in-outline" title={t('login_required')} action={<Button title={t('login')} onPress={() => navigation.navigate('Login')} />} />;
  if (user.role === 'buyer') return <BecomeAgent />;
  if (id && editing.isLoading) return <ListSkeleton rows={1} />;
  if (id && editing.isError) return <ErrorState error={editing.error} onRetry={editing.refetch} />;

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setAddr = (k, v) => setF((x) => ({ ...x, address: { ...x.address, [k]: v } }));
  const kept = existing.filter((i) => !removed.includes(i.url));
  const total = kept.length + newImages.length;
  const noRooms = f.type === 'plot' || f.type === 'commercial';

  const validate = (s) => {
    const r = propertySchema.safeParse(f);
    const all = r.success ? {} : zodFieldErrors(r.error);
    const fields = s === 'all' ? null : STEP_FIELDS[s];
    const out = Object.fromEntries(Object.entries(all).filter(([k]) => !fields || fields.some((fl) => k === fl || k.startsWith(fl))));
    if ((s === 1 || s === 'all') && (f.lat == null || f.lng == null)) out.lat = 'Tap the map to pin the location';
    if ((s === 3 || s === 'all') && total === 0) out.images = 'Add at least one photo';
    setErrs(out);
    return out;
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to add pictures.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - total,
      quality: 0.7,
    });
    if (!res.canceled) setNewImages((cur) => [...cur, ...res.assets].slice(0, MAX_IMAGES - kept.length));
  };

  const pinWithGps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Allow location to pin your property.');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setF((x) => ({ ...x, lat: pos.coords.latitude, lng: pos.coords.longitude }));
  };

  const submit = () => {
    const bad = Object.keys(validate('all'));
    if (bad.length) {
      const first = STEP_FIELDS.findIndex((fl) => fl.some((x) => bad.some((k) => k.startsWith(x))));
      setStep(first >= 0 ? first : 3);
      return;
    }
    const data = propertySchema.parse(f);
    const fd = new FormData();
    fd.append('data', JSON.stringify(id ? { ...data, removeImages: removed } : data));
    newImages.forEach((a, i) => {
      fd.append('images', { uri: a.uri, name: a.fileName || `photo-${i}.jpg`, type: a.mimeType || 'image/jpeg' });
    });
    save.mutate(fd);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={{ flexDirection: 'row', padding: 16, gap: 6 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.accent : colors.border }} />
            <Txt size={11} bold={i === step} muted={i !== step} style={{ marginTop: 4 }}>{s}</Txt>
          </View>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Txt bold size={14} style={{ marginBottom: 8 }}>{t('purpose')}</Txt>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <Chip label="Sell" active={f.purpose === 'sale'} onPress={() => set('purpose', 'sale')} />
              <Chip label="Rent out" active={f.purpose === 'rent'} onPress={() => set('purpose', 'rent')} />
            </View>
            <Txt bold size={14} style={{ marginBottom: 8 }}>{t('type')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {PROPERTY_TYPES.map((x) => <Chip key={x} label={titleCase(x)} active={f.type === x} onPress={() => set('type', x)} />)}
            </View>
            <Input label="Title" value={f.title} onChangeText={(v) => set('title', v)} maxLength={120} error={errs.title} placeholder="e.g. Spacious 3 BHK with park view" />
            <Input label={`${t('price')} (₹)${f.purpose === 'rent' ? ' / month' : ''}`} value={f.price} onChangeText={(v) => set('price', v.replace(/\D/g, ''))} keyboardType="number-pad" error={errs.price} />
            {f.price ? <Txt muted size={12} style={{ marginTop: -10, marginBottom: 10 }}>{formatINR(f.price)}</Txt> : null}
            <Input label={`${t('area')} (${t('sqft')})`} value={f.areaSqft} onChangeText={(v) => set('areaSqft', v.replace(/\D/g, ''))} keyboardType="number-pad" error={errs.areaSqft} />
            {!noRooms ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Input label={t('bedrooms')} value={f.bedrooms} onChangeText={(v) => set('bedrooms', v.replace(/\D/g, ''))} keyboardType="number-pad" error={errs.bedrooms} /></View>
                <View style={{ flex: 1 }}><Input label={t('bathrooms')} value={f.bathrooms} onChangeText={(v) => set('bathrooms', v.replace(/\D/g, ''))} keyboardType="number-pad" error={errs.bathrooms} /></View>
              </View>
            ) : null}
            <Txt bold size={14} style={{ marginBottom: 8 }}>{t('furnishing')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FURNISHING.map((x) => <Chip key={x} label={titleCase(x)} active={f.furnishing === x} onPress={() => set('furnishing', x)} />)}
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Txt bold size={14} style={{ marginBottom: 8 }}>{t('city')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              {CITIES.map((c) => (
                <Chip key={c.name} label={c.name} active={f.address.city === c.name} onPress={() => setF((x) => ({ ...x, address: { ...x.address, city: c.name, state: c.state }, lat: x.lat ?? c.lat, lng: x.lng ?? c.lng }))} />
              ))}
            </View>
            {errs['address.city'] ? <Txt size={12} style={{ color: colors.danger, marginBottom: 8 }}>{errs['address.city']}</Txt> : <View style={{ height: 8 }} />}
            <Input label={t('locality')} value={f.address.locality} onChangeText={(v) => setAddr('locality', v)} error={errs['address.locality']} />
            <Input label="Address line" value={f.address.line} onChangeText={(v) => setAddr('line', v)} error={errs['address.line']} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Input label="State" value={f.address.state} onChangeText={(v) => setAddr('state', v)} error={errs['address.state']} /></View>
              <View style={{ flex: 1 }}><Input label="Pincode" value={f.address.pincode} onChangeText={(v) => setAddr('pincode', v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} error={errs['address.pincode']} /></View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Txt bold size={14}>{t('location')}</Txt>
              <Button small variant="outline" icon="locate" title="Use GPS" onPress={pinWithGps} />
            </View>
            <OsmMap mode="picker" pick={f.lat != null ? [f.lat, f.lng] : null} onPick={(lat, lng) => setF((x) => ({ ...x, lat, lng }))} style={{ height: 260, borderRadius: 14 }} />
            <Txt size={12} muted={!errs.lat} style={{ marginTop: 6, color: errs.lat ? colors.danger : colors.muted }}>
              {errs.lat || (f.lat != null ? `Pinned at ${f.lat.toFixed(5)}, ${f.lng.toFixed(5)} — tap or drag to adjust` : 'Tap the map to drop a pin')}
            </Txt>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Input label={t('description')} value={f.description} onChangeText={(v) => set('description', v)} multiline maxLength={5000} error={errs.description} style={{ minHeight: 140, textAlignVertical: 'top' }} />
            <Txt bold size={14} style={{ marginBottom: 8 }}>{t('amenities')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {AMENITIES.map((a) => (
                <Chip key={a} label={titleCase(a)} active={f.amenities.includes(a)} onPress={() => set('amenities', f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])} />
              ))}
            </View>
            <Txt muted size={13} style={{ marginBottom: 10 }}>Contact shown after a buyer unlocks (optional, defaults to your profile). Buyers see it masked until they spend a credit.</Txt>
            <Input label={t('phone')} value={f.contactPhone} onChangeText={(v) => set('contactPhone', v.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} error={errs.contactPhone} />
            <Input label={t('whatsapp')} value={f.contactWhatsapp} onChangeText={(v) => set('contactWhatsapp', v.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} error={errs.contactWhatsapp} />
            <Input label={t('email')} value={f.contactEmail} onChangeText={(v) => set('contactEmail', v)} keyboardType="email-address" autoCapitalize="none" error={errs.contactEmail} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Button title={`Add photos (${total}/${MAX_IMAGES})`} icon="images-outline" variant="outline" onPress={pickImages} disabled={total >= MAX_IMAGES} />
            {errs.images ? <Txt size={12} style={{ color: colors.danger, marginTop: 6 }}>{errs.images}</Txt> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {[...kept.map((i) => ({ uri: i.url, existing: true })), ...newImages].map((img, k) => (
                <View key={img.uri} style={{ width: '31%', aspectRatio: 1 }}>
                  <Image source={{ uri: img.uri }} style={{ flex: 1, borderRadius: 10 }} contentFit="cover" />
                  {k === 0 ? <Txt size={10} bold style={{ position: 'absolute', left: 6, bottom: 6, color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, borderRadius: 6 }}>Cover</Txt> : null}
                  <Pressable
                    onPress={() => (img.existing ? setRemoved((r) => [...r, img.uri]) : setNewImages((n) => n.filter((x) => x.uri !== img.uri)))}
                    style={{ position: 'absolute', right: 4, top: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}
                    accessibilityLabel="Remove photo"
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Txt bold>{f.title || 'Untitled'}</Txt>
              <Txt muted size={13}>{titleCase(f.type)} for {f.purpose} · {f.price ? formatINR(f.price) : '—'} · {f.address.locality}, {f.address.city}</Txt>
            </View>
          </>
        ) : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
        <Button title={t('back')} variant="outline" disabled={step === 0} onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <Button title={t('next')} style={{ flex: 2 }} onPress={() => !Object.keys(validate(step)).length && setStep((s) => s + 1)} />
        ) : (
          <Button title={id ? t('save') : t('submit')} style={{ flex: 2 }} loading={save.isPending} onPress={submit} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
