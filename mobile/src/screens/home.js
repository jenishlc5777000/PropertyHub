import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { fonts, shadows, useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useBalance, useConfig } from '../hooks';
import PropertyCard from '../components/PropertyCard';
import { Chip, ErrorState, Txt } from '../components/ui';

const HERO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=70&auto=format&fit=crop';
const TYPES = [
  { type: 'apartment', icon: 'business-outline', label: 'Apartments' },
  { type: 'villa', icon: 'leaf-outline', label: 'Villas' },
  { type: 'house', icon: 'home-outline', label: 'Houses' },
  { type: 'plot', icon: 'map-outline', label: 'Plots' },
  { type: 'commercial', icon: 'briefcase-outline', label: 'Offices' },
];

function SectionTitle({ eyebrow, title, onAll }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 14 }}>
      <View>
        <Txt semibold size={11} style={{ color: colors.dark ? colors.accentBright : colors.accent, letterSpacing: 1.4 }}>{eyebrow.toUpperCase()}</Txt>
        <Txt display size={26} style={{ marginTop: 2 }}>{title}</Txt>
      </View>
      {onAll ? (
        <Pressable onPress={onAll} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 4 }}>
          <Txt semibold size={13}>{t('viewAll')}</Txt>
          <Ionicons name="arrow-forward" size={14} color={colors.text} />
        </Pressable>
      ) : null}
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
      snapToInterval={292}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: balance } = useBalance();
  const [q, setQ] = useState('');
  const [purpose, setPurpose] = useState('sale');
  const { cities, singleCity, freeCredits } = useConfig();
  const areas = cities.flatMap((c) => c.localities.map((l) => ({ ...l, city: c.name })));
  const featured = useQuery({ queryKey: ['featured'], queryFn: api.properties.featured });
  const latest = useQuery({ queryKey: ['properties', { sort: 'newest', limit: 8, boost: '0' }], queryFn: () => api.properties.list({ sort: 'newest', limit: 8, boost: '0' }) });
  const notifs = useQuery({ queryKey: ['notifications'], queryFn: api.notifications.list, enabled: Boolean(user) });
  const refreshing = featured.isRefetching || latest.isRefetching;
  const go = (params) => navigation.navigate('Search', { filters: params, at: Date.now() });

  const stats = [
    latest.data?.meta?.total != null && [latest.data.meta.total, 'homes live'],
    [areas.length, 'localities'],
    [freeCredits ?? 7, 'free contacts'],
  ].filter(Boolean);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { featured.refetch(); latest.refetch(); }} tintColor="#fff" />}
    >
      {/* Hero */}
      <View style={{ backgroundColor: colors.brand }}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={['rgba(15,42,74,0.25)', 'rgba(15,42,74,0.75)', '#0f2a4a']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 26 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.logoMark}>
                <Ionicons name="home" size={15} color={colors.accentBright} />
              </View>
              <Txt display size={21} style={{ color: '#fff' }}>
                Property<Txt display size={21} style={{ color: colors.accentBright }}>Hub</Txt>
              </Txt>
            </View>
            {user ? (
              <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={10} accessibilityLabel={t('notifications')} style={styles.glassBtn}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {notifs.data?.unread > 0 ? <View style={styles.dot} /> : null}
              </Pressable>
            ) : (
              <Pressable onPress={() => navigation.navigate('Login')} style={styles.glassPill}>
                <Txt semibold size={13} style={{ color: '#fff' }}>{t('login')}</Txt>
              </Pressable>
            )}
          </View>

          <View style={styles.livePill}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentBright }} />
            <Txt semibold size={12} style={{ color: '#fff' }}>Now live in {cities.map((c) => c.name).join(', ')}</Txt>
          </View>
          <Txt display size={36} style={{ color: '#fff', marginTop: 12, lineHeight: 40 }}>
            {singleCity ? t('taglineCity', { city: singleCity.name }) : t('tagline')}
          </Txt>
          {user && balance ? (
            <Pressable onPress={() => navigation.navigate('Credits')} style={[styles.livePill, { marginTop: 12, backgroundColor: 'rgba(52,211,153,0.16)' }]}>
              <Ionicons name="wallet-outline" size={13} color={colors.accentBright} />
              <Txt semibold size={12} style={{ color: '#fff' }}>{t('creditsLeft', { free: balance.free, paid: balance.paid })}</Txt>
            </Pressable>
          ) : null}

          {/* Floating search card */}
          <View style={[styles.searchCard, shadows.lift, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {['sale', 'rent'].map((p) => (
                <Pressable key={p} onPress={() => setPurpose(p)} style={[styles.seg, purpose === p && { backgroundColor: colors.chipActiveBg }]}>
                  <Txt semibold size={13} style={{ color: purpose === p ? colors.chipActiveText : colors.muted }}>{p === 'sale' ? t('buy') : t('rent')}</Txt>
                </Pressable>
              ))}
            </View>
            <View style={[styles.searchRow, { backgroundColor: colors.subtle }]}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                onSubmitEditing={() => go({ q, purpose })}
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
              />
              <Pressable onPress={() => go({ q, purpose })} style={[styles.goBtn, { backgroundColor: colors.accent }]} accessibilityLabel={t('search')}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)', paddingTop: 16 }}>
            {stats.map(([v, l]) => (
              <View key={l} style={{ flex: 1 }}>
                <Txt display size={26} style={{ color: '#fff' }}>{v}</Txt>
                <Txt size={12} style={{ color: 'rgba(255,255,255,0.72)' }}>{l}</Txt>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Areas + near me */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 18, gap: 8 }}>
        <Chip label={t('nearMe')} active onPress={() => navigation.navigate('Map', { autoNear: Date.now() })} />
        {areas.map((a) => (
          <Chip key={`${a.city}|${a.name}`} label={singleCity ? a.name : `${a.name}, ${a.city}`} onPress={() => go({ locality: a.name, ...(singleCity ? {} : { city: a.city }) })} />
        ))}
      </ScrollView>

      {/* Property types */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 8 }}>
        {TYPES.map(({ type, icon, label }) => (
          <Pressable key={type} onPress={() => go({ type })} style={[styles.typeTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.typeIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name={icon} size={20} color={colors.dark ? colors.accentBright : colors.accent} />
            </View>
            <Txt semibold size={13}>{label}</Txt>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ marginTop: 26 }}>
        <SectionTitle eyebrow="Hand-picked" title={t('featured')} onAll={() => go({})} />
        <HorizontalList query={featured} />
      </View>
      <View style={{ marginTop: 18 }}>
        <SectionTitle eyebrow="Just listed" title={t('latest')} onAll={() => go({ sort: 'newest' })} />
        <HorizontalList query={latest} />
      </View>

      {/* Owner CTA */}
      <View style={[styles.cta, { backgroundColor: colors.brand }]}>
        <Txt semibold size={11} style={{ color: colors.accentBright, letterSpacing: 1.4 }}>FOR OWNERS & AGENTS</Txt>
        <Txt display size={26} style={{ color: '#fff', marginTop: 6 }}>List your property for free.</Txt>
        <Txt size={14} style={{ color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>Every ad is reviewed, then shown to genuine buyers and tenants.</Txt>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Pressable onPress={() => (user ? navigation.navigate('PostProperty') : navigation.navigate('Login'))} style={[styles.ctaBtn, { backgroundColor: colors.accent }]}>
            <Txt semibold style={{ color: '#fff' }}>{t('postProperty')}</Txt>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Emi')} style={[styles.ctaBtn, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}>
            <Ionicons name="calculator-outline" size={16} color="#fff" />
            <Txt semibold style={{ color: '#fff' }}>EMI</Txt>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logoMark: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  glassBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  glassPill: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  dot: { position: 'absolute', right: 8, top: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 34, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchCard: { marginTop: 22, borderRadius: 22, padding: 12 },
  seg: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingLeft: 12, paddingRight: 5 },
  goBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  typeTile: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 10, paddingRight: 16, borderRadius: 16, borderWidth: 1 },
  typeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cta: { margin: 20, marginTop: 28, borderRadius: 26, padding: 22 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
});
