import { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, apiErrorMessage, changePasswordSchema, formatINR, formatPriceShort, profileSchema, whatsappLink, zodFieldErrors } from '@propertyhub/shared';
import { api, tokenStore, API_URL } from '../api';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useBalance } from '../hooks';
import PropertyCard from '../components/PropertyCard';
import { Paywall } from '../components/ShowContact';
import { EmiBox } from './PropertyDetail';
import { Button, Card, Chip, EmptyState, ErrorState, Input, ListSkeleton, StatusPill, Txt } from '../components/ui';

function LoginGate({ navigation, children }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (user) return children;
  return <EmptyState icon="log-in-outline" title={t('login_required')} action={<Button title={t('login')} onPress={() => navigation.navigate('Login')} />} />;
}

const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function FavoritesScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['favorites'], queryFn: api.favorites.list, enabled: Boolean(user) });
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Txt bold size={24} style={{ padding: 16, paddingBottom: 4 }}>{t('favorites')}</Txt>
      <LoginGate navigation={navigation}>
        {q.isLoading ? (
          <ListSkeleton rows={2} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : (
          <FlatList
            data={q.data}
            keyExtractor={(p) => p._id}
            renderItem={({ item }) => <PropertyCard p={item} />}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.accent} />}
            ListEmptyComponent={<EmptyState icon="heart-outline" title="No saved properties yet" text="Tap ♡ on any listing. Favorites sync with the website and you'll get price-drop alerts." />}
          />
        )}
      </LoginGate>
    </SafeAreaView>
  );
}

export function MyListingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ['agentStats'], queryFn: api.agent.stats });
  const q = useQuery({ queryKey: ['myListings'], queryFn: () => api.properties.mine({ limit: 50 }) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['myListings'] });
    qc.invalidateQueries({ queryKey: ['agentStats'] });
  };
  const status = useMutation({ mutationFn: ({ id, s }) => api.properties.setStatus(id, s), onSuccess: refresh, onError: (e) => Alert.alert('Error', apiErrorMessage(e)) });
  const del = useMutation({ mutationFn: api.properties.remove, onSuccess: refresh, onError: (e) => Alert.alert('Error', apiErrorMessage(e)) });
  const s = stats.data;

  const header = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
      {[
        [t('activeListings'), s?.byStatus?.approved ?? 0],
        [t('views'), s?.views ?? '–'],
        [t('unlocks'), s?.unlocks ?? '–'],
        [t('leads'), s?.inquiries ?? '–'],
        ['Visits', s?.upcomingVisits ?? '–'],
        ['Saved', s?.favorites ?? '–'],
      ].map(([l, v]) => (
        <Card key={l} style={{ width: '31%', padding: 12 }}>
          <Txt bold size={20}>{v}</Txt>
          <Txt muted size={11}>{l}</Txt>
        </Card>
      ))}
      <Button title={t('postProperty')} icon="add" onPress={() => navigation.navigate('PostProperty')} style={{ width: '100%' }} />
    </View>
  );

  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={q.data.items}
      keyExtractor={(p) => p._id}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={refresh} tintColor={colors.accent} />}
      ListEmptyComponent={<EmptyState icon="business-outline" title="No listings yet" text="Post your first property for free." />}
      renderItem={({ item: p }) => (
        <Card style={{ marginBottom: 12, padding: 12 }}>
          <Pressable onPress={() => navigation.navigate('PropertyDetail', { slug: p.slug })} style={{ flexDirection: 'row', gap: 12 }}>
            <Image source={{ uri: p.images[0]?.url }} style={{ width: 80, height: 80, borderRadius: 10 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <StatusPill status={p.status} />
              <Txt bold numberOfLines={1}>{p.title}</Txt>
              <Txt muted size={12}>{formatPriceShort(p.price)} · {p.views} views · {p.unlockCount} unlocks</Txt>
              {p.status === 'rejected' && p.rejectionReason ? <Txt size={12} style={{ color: colors.danger }}>{p.rejectionReason}</Txt> : null}
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {p.status === 'approved' ? <Button small variant="outline" title={p.purpose === 'rent' ? t('markRented') : t('markSold')} onPress={() => status.mutate({ id: p._id, s: p.purpose === 'rent' ? 'rented' : 'sold' })} /> : null}
            {['sold', 'rented'].includes(p.status) ? <Button small variant="outline" title="Relist" onPress={() => status.mutate({ id: p._id, s: 'approved' })} /> : null}
            <Button small variant="outline" icon="create-outline" title={t('edit')} onPress={() => navigation.navigate('PostProperty', { id: p._id })} />
            <Button
              small
              variant="ghost"
              icon="trash-outline"
              title={t('delete')}
              onPress={() => Alert.alert('Delete listing?', `"${p.title}" will be permanently removed.`, [{ text: t('cancel') }, { text: t('delete'), style: 'destructive', onPress: () => del.mutate(p._id) }])}
            />
          </View>
        </Card>
      )}
    />
  );
}

export function UnlockedContactsScreen({ navigation }) {
  const { colors } = useTheme();
  const q = useInfiniteQuery({
    queryKey: ['unlocked'],
    queryFn: ({ pageParam }) => api.credits.unlocked({ page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
  const rows = q.data?.pages.flatMap((p) => p.items) || [];
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={rows}
      keyExtractor={(r) => r._id}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      onEndReached={() => q.hasNextPage && q.fetchNextPage()}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.accent} />}
      ListEmptyComponent={<EmptyState icon="lock-open-outline" title="No unlocked contacts yet" text="Use “Show contact” on any listing." />}
      renderItem={({ item: { property: p, unlockedAt, creditType } }) =>
        p ? (
          <Card style={{ marginBottom: 12, padding: 12 }}>
            <Pressable onPress={() => navigation.navigate('PropertyDetail', { slug: p.slug })} style={{ flexDirection: 'row', gap: 12 }}>
              <Image source={{ uri: p.images[0]?.url }} style={{ width: 64, height: 64, borderRadius: 10 }} />
              <View style={{ flex: 1 }}>
                <Txt bold numberOfLines={1}>{p.title}</Txt>
                <Txt muted size={12}>{p.contact.name} · {formatPriceShort(p.price)}</Txt>
                <Txt muted size={11}>Unlocked {date(unlockedAt)} · {creditType} credit</Txt>
              </View>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button small variant="dark" icon="call" title={p.contact.phone} onPress={() => Linking.openURL(`tel:${p.contact.phone}`)} style={{ flex: 1 }} />
              <Button small variant="whatsapp" icon="logo-whatsapp" onPress={() => Linking.openURL(whatsappLink(p.contact.whatsapp))} />
              {p.contact.email ? <Button small variant="outline" icon="mail-outline" onPress={() => Linking.openURL(`mailto:${p.contact.email}`)} /> : null}
            </View>
          </Card>
        ) : (
          <Card style={{ marginBottom: 12 }}><Txt muted>This listing was removed by the owner.</Txt></Card>
        )
      }
    />
  );
}

async function downloadInvoice(order) {
  const dir = new Directory(Paths.cache, 'invoices');
  if (!dir.exists) dir.create();
  const target = new File(dir, `${order.invoiceNo.replace(/\//g, '-')}.pdf`);
  if (target.exists) target.delete();
  const token = await tokenStore.getAccess();
  const task = File.createDownloadTask(`${API_URL}/payments/orders/${order._id}/invoice`, target, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const file = await task.downloadAsync();
  if (file && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
}

export function CreditsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const bal = useBalance();
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.payments.orders });
  const [busyInvoice, setBusyInvoice] = useState(null);
  const b = bal.data;
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={bal.isRefetching} onRefresh={() => { bal.refetch(); orders.refetch(); }} tintColor={colors.accent} />}
    >
      {bal.isLoading ? <ListSkeleton rows={1} /> : bal.isError ? <ErrorState error={bal.error} onRetry={bal.refetch} /> : (
        <View style={{ backgroundColor: colors.brand, borderRadius: 18, padding: 18 }}>
          <Txt size={13} style={{ color: '#adc6e6' }}>Total credits</Txt>
          <Txt bold size={36} style={{ color: '#fff' }}>{b.total}</Txt>
          <Txt style={{ color: '#d6e3f3' }}>{t('creditsLeft', { free: b.free, paid: b.paid })}</Txt>
          <Txt size={12} style={{ color: '#adc6e6', marginTop: 4 }}>
            Free: {t('neverExpires')}{b.nextExpiry ? ` · Paid: next expiry ${date(b.nextExpiry)}` : ''}
          </Txt>
        </View>
      )}
      {b?.batches?.length ? (
        <Card>
          <Txt bold style={{ marginBottom: 8 }}>Paid credit batches</Txt>
          {b.batches.map((x) => (
            <View key={x._id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border }}>
              <Txt>{x.amount} / {x.initial} <Txt muted size={12}>({x.source})</Txt></Txt>
              <Txt muted size={13}>{t('expiresOn', { date: date(x.expiresAt) })}</Txt>
            </View>
          ))}
        </Card>
      ) : null}
      <Card>
        <Txt bold size={17} style={{ marginBottom: 12 }}>Buy credits</Txt>
        <Paywall />
      </Card>
      <Card>
        <Txt bold size={17} style={{ marginBottom: 8 }}>{t('purchaseHistory')}</Txt>
        {orders.isLoading ? <Txt muted>{t('loading')}</Txt> : orders.isError ? <ErrorState error={orders.error} onRetry={orders.refetch} /> : !orders.data.length ? (
          <Txt muted>No purchases yet.</Txt>
        ) : (
          orders.data.map((o) => (
            <View key={o._id} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt bold>{o.credits} credits · {formatINR(o.amount, { decimals: 2 })}</Txt>
                <StatusPill status={o.status} />
              </View>
              <Txt muted size={12}>{date(o.paidAt || o.createdAt)} · incl. GST {formatINR(o.gstAmount, { decimals: 2 })}</Txt>
              {o.invoiceNo ? (
                <Button
                  small
                  variant="outline"
                  icon="download-outline"
                  title={`${t('invoice')} ${o.invoiceNo}`}
                  loading={busyInvoice === o._id}
                  onPress={async () => {
                    setBusyInvoice(o._id);
                    try {
                      await downloadInvoice(o);
                    } catch (e) {
                      Alert.alert('Error', e.message || 'Could not download invoice');
                    } finally {
                      setBusyInvoice(null);
                    }
                  }}
                  style={{ alignSelf: 'flex-start' }}
                />
              ) : null}
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

export function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: api.notifications.list });
  const readAll = useMutation({ mutationFn: api.notifications.readAll, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const open = (n) => {
    if (!n.read) api.notifications.read(n._id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
    if (n.data?.review) navigation.navigate('AdminReview');
    else if (n.data?.inquiryId) navigation.navigate('Chat', { id: n.data.inquiryId });
    else if (n.data?.slug || n.data?.propertyId) navigation.navigate('PropertyDetail', { slug: n.data.slug || n.data.propertyId });
    else if (['credits', 'payment'].includes(n.type)) navigation.navigate('Credits');
  };
  const icon = { inquiry: 'chatbubble', message: 'chatbubbles', visit: 'calendar', listing: 'business', price_drop: 'trending-down', credits: 'wallet', payment: 'card', system: 'information-circle' };
  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={q.data.items}
      keyExtractor={(n) => n._id}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.accent} />}
      ListHeaderComponent={q.data.unread ? <Button small variant="ghost" title="Mark all read" onPress={() => readAll.mutate()} style={{ alignSelf: 'flex-end', marginBottom: 8 }} /> : null}
      ListEmptyComponent={<EmptyState icon="notifications-outline" title="No notifications" />}
      renderItem={({ item: n }) => (
        <Pressable onPress={() => open(n)}>
          <Card style={{ marginBottom: 10, flexDirection: 'row', gap: 12, padding: 12, backgroundColor: n.read ? colors.card : colors.accentSoft }}>
            <Ionicons name={icon[n.type] || 'notifications'} size={22} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Txt bold={!n.read}>{n.title}</Txt>
              {n.body ? <Txt muted size={13}>{n.body}</Txt> : null}
              <Txt muted size={11} style={{ marginTop: 4 }}>{new Date(n.createdAt).toLocaleString('en-IN')}</Txt>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

function MenuItem({ icon, label, onPress, right }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border }}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Txt style={{ flex: 1 }}>{label}</Txt>
      {right}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function AdminMenuItem({ onPress }) {
  const { colors } = useTheme();
  const { data } = useQuery({ queryKey: ['adminStats'], queryFn: api.admin.stats });
  const pending = data?.properties?.pending || 0;
  return (
    <MenuItem
      icon="shield-checkmark-outline"
      label="Admin · Review queue"
      onPress={onPress}
      right={pending ? <View style={{ backgroundColor: colors.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 }}><Txt bold size={12} style={{ color: '#fff' }}>{pending}</Txt></View> : null}
    />
  );
}

export function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { data: bal } = useBalance();
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState
          icon="person-circle-outline"
          title={t('welcomeBack')}
          text="Log in to save favorites, unlock owner contacts and post properties."
          action={
            <View style={{ gap: 10, width: 240 }}>
              <Button title={t('login')} onPress={() => navigation.navigate('Login')} />
              <Button title={t('register')} variant="outline" onPress={() => navigation.navigate('Register')} />
              <Button title={t('settings')} variant="ghost" onPress={() => navigation.navigate('Settings')} />
            </View>
          }
        />
      </SafeAreaView>
    );
  }
  const isAgent = user.role !== 'buyer';
  const isAdmin = user.role === 'admin';
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={{ width: 60, height: 60, borderRadius: 30 }} />
          ) : (
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Txt bold size={24} style={{ color: '#fff' }}>{user.name[0]}</Txt>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Txt bold size={19}>{user.name}</Txt>
            <Txt muted size={13}>{user.email}</Txt>
            <Txt muted size={12} style={{ textTransform: 'capitalize' }}>{user.role}</Txt>
          </View>
        </View>
        <Pressable onPress={() => navigation.navigate('Credits')} style={{ backgroundColor: colors.accentSoft, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Ionicons name="wallet" size={22} color={colors.accent} />
          <Txt bold style={{ flex: 1, color: colors.accent }}>{bal ? t('creditsLeft', { free: bal.free, paid: bal.paid }) : t('credits')}</Txt>
          <Txt bold size={13} style={{ color: colors.accent }}>Buy</Txt>
        </Pressable>
        {isAdmin ? <AdminMenuItem onPress={() => navigation.navigate('AdminReview')} /> : null}
        {isAgent ? <MenuItem icon="grid-outline" label={`${t('dashboard')} · ${t('myListings')}`} onPress={() => navigation.navigate('MyListings')} /> : null}
        <MenuItem icon="add-circle-outline" label={t('postProperty')} onPress={() => navigation.navigate('PostProperty')} />
        <MenuItem icon="chatbubbles-outline" label={t('inquiries')} onPress={() => navigation.navigate('Inquiries')} />
        <MenuItem icon="lock-open-outline" label={t('unlockedContacts')} onPress={() => navigation.navigate('UnlockedContacts')} />
        <MenuItem icon="receipt-outline" label={t('creditsBilling')} onPress={() => navigation.navigate('Credits')} />
        <MenuItem icon="notifications-outline" label={t('notifications')} onPress={() => navigation.navigate('Notifications')} />
        <MenuItem icon="calculator-outline" label={t('emiCalculator')} onPress={() => navigation.navigate('Emi')} />
        <MenuItem icon="settings-outline" label={t('settings')} onPress={() => navigation.navigate('Settings')} />
        <Button title={t('logout')} variant="ghost" icon="log-out-outline" onPress={signOut} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const { user, setUser } = useAuth();
  const [f, setF] = useState(user ? { name: user.name, phone: user.phone, whatsapp: user.whatsapp || '', bio: user.bio || '' } : null);
  const [errs, setErrs] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrs, setPwErrs] = useState({});
  const save = useMutation({
    mutationFn: api.users.update,
    onSuccess: (u) => { setUser(u); Alert.alert('Saved', 'Profile updated'); },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });
  const changePw = useMutation({
    mutationFn: api.users.changePassword,
    onSuccess: () => { setPw({ currentPassword: '', newPassword: '' }); Alert.alert('Saved', 'Password changed'); },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });
  const setLang = (code) => {
    i18n.changeLanguage(code);
    if (user) api.users.update({ language: code }).then(setUser).catch(() => {});
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Txt bold style={{ marginBottom: 10 }}>{t('language')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGUAGES.map((l) => <Chip key={l.code} label={l.label} active={i18n.language === l.code} onPress={() => setLang(l.code)} />)}
        </View>
      </Card>
      <Card>
        <Txt bold style={{ marginBottom: 10 }}>{t('darkMode')}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => <Chip key={k} label={l} active={mode === k} onPress={() => setMode(k)} />)}
        </View>
      </Card>
      {user && f ? (
        <>
          <Card>
            <Txt bold style={{ marginBottom: 10 }}>{t('profile')}</Txt>
            <Input label={t('name')} value={f.name} onChangeText={(name) => setF({ ...f, name })} error={errs.name} />
            <Input label={t('phone')} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v.replace(/\D/g, '') })} keyboardType="phone-pad" maxLength={10} error={errs.phone} />
            <Input label={t('whatsapp')} value={f.whatsapp} onChangeText={(v) => setF({ ...f, whatsapp: v.replace(/\D/g, '') })} keyboardType="phone-pad" maxLength={10} error={errs.whatsapp} />
            {user.role !== 'buyer' ? <Input label="About you" value={f.bio} onChangeText={(bio) => setF({ ...f, bio })} multiline maxLength={500} error={errs.bio} /> : null}
            <Button
              title={t('save')}
              loading={save.isPending}
              onPress={() => {
                const r = profileSchema.safeParse(f);
                if (!r.success) return setErrs(zodFieldErrors(r.error));
                setErrs({});
                save.mutate(r.data);
              }}
            />
          </Card>
          <Card>
            <Txt bold style={{ marginBottom: 10 }}>Change password</Txt>
            <Input label="Current password" value={pw.currentPassword} onChangeText={(v) => setPw({ ...pw, currentPassword: v })} secureTextEntry error={pwErrs.currentPassword} />
            <Input label="New password" value={pw.newPassword} onChangeText={(v) => setPw({ ...pw, newPassword: v })} secureTextEntry error={pwErrs.newPassword} />
            <Button
              title="Update password"
              variant="outline"
              loading={changePw.isPending}
              onPress={() => {
                const r = changePasswordSchema.safeParse(pw);
                if (!r.success) return setPwErrs(zodFieldErrors(r.error));
                setPwErrs({});
                changePw.mutate(r.data);
              }}
            />
          </Card>
        </>
      ) : null}
      <Card>
        <Txt bold style={{ marginBottom: 6 }}>Legal</Txt>
        {[['privacy', 'privacy'], ['terms', 'terms'], ['refund-policy', 'refund']].map(([path, key]) => (
          <Pressable key={path} onPress={() => Linking.openURL(`${process.env.EXPO_PUBLIC_SITE_URL || 'https://propertyhub.in'}/${path}`)} style={{ paddingVertical: 8 }}>
            <Txt style={{ color: colors.accent }}>{t(key)}</Txt>
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}

export function AgentProfileScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['agent', route.params.id], queryFn: () => api.users.agent(route.params.id) });
  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const a = q.data.agent;
  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={q.data.listings}
      keyExtractor={(p) => p._id}
      contentContainerStyle={{ padding: 16 }}
      onLayout={() => navigation.setOptions({ title: a.name })}
      ListHeaderComponent={
        <Card style={{ marginBottom: 16, alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Txt bold size={28} style={{ color: '#fff' }}>{a.name[0]}</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Txt bold size={22}>{a.name}</Txt>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
          </View>
          <Txt muted size={13}>Member since {new Date(a.createdAt).getFullYear()} · {q.data.stats.listings} listings</Txt>
          {a.bio ? <Txt muted style={{ textAlign: 'center', marginTop: 8 }}>{a.bio}</Txt> : null}
          <Txt bold style={{ marginTop: 14, alignSelf: 'flex-start' }}>{t('agentListings', { name: a.name })}</Txt>
        </Card>
      }
      ListEmptyComponent={<EmptyState icon="business-outline" title="No active listings" />}
      renderItem={({ item }) => <PropertyCard p={item} />}
    />
  );
}

export function EmiScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Card>
        <EmiBox price={7500000} />
      </Card>
      <Txt muted size={13} style={{ marginTop: 14 }}>Rates are indicative. Most Indian banks finance 75–90% of the property value.</Txt>
    </ScrollView>
  );
}
