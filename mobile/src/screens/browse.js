import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AMENITIES, CITIES, FURNISHING, PROPERTY_TYPES, titleCase } from '@propertyhub/shared';
import { api } from '../api';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useBalance } from '../hooks';
import PropertyCard from '../components/PropertyCard';
import OsmMap from '../components/OsmMap';
import { Button, Chip, EmptyState, ErrorState, ListSkeleton, Sheet, Txt } from '../components/ui';

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)));

function CreditPill() {
  const { t } = useTranslation();
  const { data } = useBalance();
  const { colors } = useTheme();
  if (!data) return null;
  return (
    <View style={{ backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      <Ionicons name="wallet-outline" size={13} color={colors.accent} />
      <Txt size={12} bold style={{ color: colors.accent }}>{t('creditsLeft', { free: data.free, paid: data.paid })}</Txt>
    </View>
  );
}

function HorizontalList({ query }) {
  const { colors } = useTheme();
  if (query.isLoading) return <ActivityIndicator color={colors.accent} style={{ margin: 30 }} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const items = Array.isArray(query.data) ? query.data : query.data?.items || [];
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(p) => p._id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      renderItem={({ item }) => (
        <View style={{ width: 280 }}>
          <PropertyCard p={item} compact />
        </View>
      )}
    />
  );
}

export function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const featured = useQuery({ queryKey: ['featured'], queryFn: api.properties.featured });
  const latest = useQuery({ queryKey: ['properties', { sort: 'newest', limit: 8, boost: '0' }], queryFn: () => api.properties.list({ sort: 'newest', limit: 8, boost: '0' }) });
  const notifs = useQuery({ queryKey: ['notifications'], queryFn: api.notifications.list, enabled: Boolean(user) });
  const refreshing = featured.isRefetching || latest.isRefetching;
  const go = (params) => navigation.navigate('Search', { filters: params, at: Date.now() });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.brand }}>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { featured.refetch(); latest.refetch(); }} tintColor={colors.accent} />}
      >
        <View style={{ backgroundColor: colors.brand, padding: 20, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt bold size={22} style={{ color: '#fff' }}>Property<Txt bold size={22} style={{ color: '#10b981' }}>Hub</Txt></Txt>
            {user ? (
              <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={10} accessibilityLabel={t('notifications')}>
                <Ionicons name="notifications-outline" size={24} color="#fff" />
                {notifs.data?.unread > 0 ? <View style={{ position: 'absolute', right: -2, top: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} /> : null}
              </Pressable>
            ) : (
              <Pressable onPress={() => navigation.navigate('Login')}><Txt bold style={{ color: '#fff' }}>{t('login')}</Txt></Pressable>
            )}
          </View>
          <Txt bold size={24} style={{ color: '#fff', marginTop: 18 }}>{t('tagline')}</Txt>
          {user ? <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><CreditPill /></View> : null}
          <View style={{ flexDirection: 'row', marginTop: 16, backgroundColor: colors.card, borderRadius: 14, alignItems: 'center', paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              onSubmitEditing={() => go({ q })}
              style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 8, color: colors.text }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Button title={t('buy')} small variant="outline" onPress={() => go({ purpose: 'sale' })} style={{ flex: 1 }} />
            <Button title={t('rent')} small variant="outline" onPress={() => go({ purpose: 'rent' })} style={{ flex: 1 }} />
            <Button title={t('postProperty')} small onPress={() => (user ? navigation.navigate('PostProperty') : navigation.navigate('Login'))} style={{ flex: 1.4 }} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
          {CITIES.map((c) => <Chip key={c.name} label={c.name} onPress={() => go({ city: c.name })} />)}
        </ScrollView>

        <Txt bold size={19} style={{ marginHorizontal: 16, marginBottom: 12 }}>{t('featured')}</Txt>
        <HorizontalList query={featured} />
        <Txt bold size={19} style={{ marginHorizontal: 16, marginVertical: 12 }}>{t('latest')}</Txt>
        <HorizontalList query={latest} />
        <Pressable onPress={() => navigation.navigate('Emi')} style={{ margin: 16, padding: 18, borderRadius: 16, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="calculator-outline" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Txt bold style={{ color: '#fff' }}>{t('emiCalculator')}</Txt>
            <Txt size={13} style={{ color: '#d1fae5' }}>Plan your home loan in seconds</Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const PRICE = { sale: [0, 2500000, 5000000, 10000000, 20000000, 50000000], rent: [0, 10000, 20000, 30000, 50000, 100000] };
const priceLabel = (n) => (n >= 1e7 ? `₹${n / 1e7}Cr` : n >= 1e5 ? `₹${n / 1e5}L` : n >= 1e3 ? `₹${n / 1e3}K` : 'Any');

function FilterSheet({ visible, onClose, value, onApply }) {
  const { t } = useTranslation();
  const [f, setF] = useState(value);
  const set = (k, v) => setF((x) => ({ ...x, [k]: x[k] === v ? '' : v }));
  const amen = f.amenities || [];
  const prices = PRICE[f.purpose || 'sale'];
  const Section = ({ title, children }) => (
    <View style={{ marginBottom: 16 }}>
      <Txt bold size={14} style={{ marginBottom: 8 }}>{title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title={t('filters')}>
      <ScrollView style={{ maxHeight: 520 }}>
        <Section title={t('purpose')}>
          {['sale', 'rent'].map((p) => <Chip key={p} label={p === 'sale' ? t('buy') : t('rent')} active={f.purpose === p} onPress={() => setF({ ...f, purpose: f.purpose === p ? '' : p, minPrice: '', maxPrice: '' })} />)}
        </Section>
        <Section title={t('city')}>
          {CITIES.map((c) => <Chip key={c.name} label={c.name} active={f.city === c.name} onPress={() => set('city', c.name)} />)}
        </Section>
        <Section title={t('type')}>
          {PROPERTY_TYPES.map((x) => <Chip key={x} label={titleCase(x)} active={f.type === x} onPress={() => set('type', x)} />)}
        </Section>
        <Section title={t('minPrice')}>
          {prices.slice(0, -1).map((p) => <Chip key={p} label={priceLabel(p)} active={String(f.minPrice) === String(p)} onPress={() => set('minPrice', String(p))} />)}
        </Section>
        <Section title={t('maxPrice')}>
          {prices.slice(1).map((p) => <Chip key={p} label={priceLabel(p)} active={String(f.maxPrice) === String(p)} onPress={() => set('maxPrice', String(p))} />)}
        </Section>
        <Section title={t('bedrooms')}>
          {['1', '2', '3', '4'].map((b) => <Chip key={b} label={b === '4' ? '4+' : b} active={f.beds === b} onPress={() => set('beds', b)} />)}
        </Section>
        <Section title={t('furnishing')}>
          {FURNISHING.map((x) => <Chip key={x} label={titleCase(x)} active={f.furnishing === x} onPress={() => set('furnishing', x)} />)}
        </Section>
        <Section title={t('amenities')}>
          {AMENITIES.map((a) => (
            <Chip key={a} label={titleCase(a)} active={amen.includes(a)} onPress={() => setF({ ...f, amenities: amen.includes(a) ? amen.filter((x) => x !== a) : [...amen, a] })} />
          ))}
        </Section>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <Button title={t('reset')} variant="outline" style={{ flex: 1 }} onPress={() => { setF({}); onApply({}); }} />
        <Button title={t('apply')} style={{ flex: 1 }} onPress={() => onApply(f)} />
      </View>
    </Sheet>
  );
}

export function SearchScreen({ route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [filters, setFilters] = useState(route.params?.filters || {});
  const [lastAt, setLastAt] = useState(route.params?.at);
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState(route.params?.filters?.q || '');
  const [showFilters, setShowFilters] = useState(false);

  // New search from Home
  if (route.params?.at && route.params.at !== lastAt) {
    setLastAt(route.params.at);
    setFilters(route.params.filters || {});
    setQ(route.params.filters?.q || '');
  }

  const params = useMemo(() => {
    const p = clean({ ...filters, q: q.trim() || undefined, sort });
    if (p.amenities) p.amenities = p.amenities.join(',');
    return p;
  }, [filters, q, sort]);

  const list = useInfiniteQuery({
    queryKey: ['properties', params],
    queryFn: ({ pageParam }) => api.properties.list({ ...params, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
  const items = list.data?.pages.flatMap((p) => p.items) || [];
  const activeCount = Object.keys(clean(filters)).filter((k) => k !== 'q').length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 10 }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder={t('searchPlaceholder')} placeholderTextColor={colors.muted} returnKeyType="search" style={{ flex: 1, padding: 10, color: colors.text }} />
          </View>
          <Pressable onPress={() => setShowFilters(true)} style={{ backgroundColor: colors.brand, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }} accessibilityLabel={t('filters')}>
            <Ionicons name="options-outline" size={20} color="#fff" />
            {activeCount ? <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: colors.accent, borderRadius: 8, minWidth: 16, alignItems: 'center' }}><Txt size={10} bold style={{ color: '#fff' }}>{activeCount}</Txt></View> : null}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[['newest', t('sortNewest')], ['price_asc', t('sortPriceAsc')], ['price_desc', t('sortPriceDesc')]].map(([k, l]) => (
            <Chip key={k} label={l} active={sort === k} onPress={() => setSort(k)} />
          ))}
        </ScrollView>
        {list.data ? <Txt muted size={13}>{t('results', { count: list.data.pages[0].meta.total })}</Txt> : null}
      </View>
      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p._id}
          renderItem={({ item }) => <PropertyCard p={item} />}
          contentContainerStyle={{ padding: 16, paddingTop: 4, flexGrow: 1 }}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={list.refetch} tintColor={colors.accent} />}
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={<EmptyState icon="search-outline" title="No properties match" text="Try removing some filters." action={<Button title={t('reset')} variant="outline" onPress={() => { setFilters({}); setQ(''); }} />} />}
        />
      )}
      <FilterSheet
        key={showFilters ? 'open' : 'closed'}
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        value={filters}
        onApply={(f) => {
          setFilters(f);
          setShowFilters(false);
        }}
      />
    </SafeAreaView>
  );
}

export function MapScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [near, setNear] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [purpose, setPurpose] = useState('');
  const all = useQuery({ queryKey: ['properties', { limit: 50, purpose }], queryFn: () => api.properties.list(clean({ limit: 50, purpose })), enabled: !near });
  const nearQ = useQuery({ queryKey: ['near', near, purpose], queryFn: () => api.properties.near(clean({ ...near, purpose })), enabled: Boolean(near) });
  const q = near ? nearQ : all;
  const items = near ? nearQ.data || [] : all.data?.items || [];

  const findNearMe = async () => {
    setLocError('');
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Location permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm: 15 });
    } catch {
      setLocError('Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Chip label={t('any')} active={!purpose} onPress={() => setPurpose('')} />
        <Chip label={t('buy')} active={purpose === 'sale'} onPress={() => setPurpose('sale')} />
        <Chip label={t('rent')} active={purpose === 'rent'} onPress={() => setPurpose('rent')} />
        <View style={{ flex: 1 }} />
        <Button
          small
          icon={near ? 'close' : 'locate'}
          title={t('nearMe')}
          variant={near ? 'outline' : 'primary'}
          loading={locating}
          onPress={() => (near ? setNear(null) : findNearMe())}
        />
      </View>
      {locError ? <Txt size={13} style={{ color: colors.danger, paddingHorizontal: 12 }}>{locError}</Txt> : null}
      {q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : (
        <View style={{ flex: 1 }}>
          <OsmMap
            properties={items}
            center={near ? [near.lat, near.lng] : undefined}
            radiusKm={near?.radiusKm}
            onSelect={(id) => {
              const p = items.find((x) => x._id === id);
              if (p) navigation.navigate('PropertyDetail', { slug: p.slug });
            }}
          />
          {q.isLoading ? <ActivityIndicator style={{ position: 'absolute', top: 16, alignSelf: 'center' }} color={colors.accent} /> : null}
          {!q.isLoading && near && !items.length ? (
            <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: colors.card, padding: 14, borderRadius: 12 }}>
              <Txt>No properties within {near.radiusKm} km of you.</Txt>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
