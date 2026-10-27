import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { formatPriceShort, titleCase } from '@propertyhub/shared';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useFavoriteIds, useToggleFavorite } from '../hooks';
import { Card, Txt } from './ui';
import ShowContact from './ShowContact';

export function FavoriteButton({ id, style }) {
  const { user } = useAuth();
  const nav = useNavigation();
  const { data: favs } = useFavoriteIds();
  const toggle = useToggleFavorite();
  const on = favs?.has(id);
  return (
    <Pressable
      hitSlop={10}
      accessibilityLabel={on ? 'Remove from favorites' : 'Save to favorites'}
      onPress={() => (user ? toggle.mutate({ id, on: !on }) : nav.navigate('Login'))}
      style={[styles.fav, style]}
    >
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={20} color={on ? '#ef4444' : '#334155'} />
    </Pressable>
  );
}

export default function PropertyCard({ p, compact }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const nav = useNavigation();
  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <Pressable onPress={() => nav.navigate('PropertyDetail', { slug: p.slug, id: p._id })}>
        <Image source={{ uri: p.images?.[0]?.url }} style={{ height: compact ? 150 : 200, backgroundColor: colors.skeleton }} contentFit="cover" transition={200} />
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: p.purpose === 'rent' ? '#0284c7' : colors.brand }]}>
            <Txt size={11} bold style={{ color: '#fff' }}>{p.purpose === 'rent' ? t('forRent') : t('forSale')}</Txt>
          </View>
          {p.featured ? (
            <View style={[styles.badge, { backgroundColor: '#fbbf24' }]}>
              <Txt size={11} bold style={{ color: '#451a03' }}>★ Featured</Txt>
            </View>
          ) : null}
        </View>
        <FavoriteButton id={p._id} style={{ position: 'absolute', right: 10, top: 10 }} />
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt bold size={20}>
              {formatPriceShort(p.price)}
              {p.purpose === 'rent' ? <Txt muted size={13}>{t('perMonth')}</Txt> : null}
            </Txt>
            <Txt muted size={12}>{titleCase(p.type)}</Txt>
          </View>
          <Txt bold numberOfLines={1} style={{ marginTop: 4 }}>{p.title}</Txt>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Txt muted size={13} numberOfLines={1} style={{ flex: 1 }}>
              {p.address?.locality}, {p.address?.city}
            </Txt>
            {p.distanceKm != null ? <Txt muted size={12}>{p.distanceKm} km</Txt> : null}
          </View>
          <View style={[styles.row, { marginTop: 10, gap: 14 }]}>
            {p.bedrooms > 0 ? <Txt muted size={13}>🛏 {p.bedrooms} {t('beds')}</Txt> : null}
            {p.bathrooms > 0 ? <Txt muted size={13}>🛁 {p.bathrooms} {t('baths')}</Txt> : null}
            <Txt muted size={13}>⬚ {p.areaSqft?.toLocaleString('en-IN')} {t('sqft')}</Txt>
          </View>
        </View>
      </Pressable>
      {!compact ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <ShowContact property={p} small />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  badges: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  fav: { backgroundColor: 'rgba(255,255,255,0.92)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
