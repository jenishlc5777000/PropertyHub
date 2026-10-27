import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { formatPriceShort, titleCase } from '@propertyhub/shared';
import { fonts, useTheme } from '../theme';
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
      style={({ pressed }) => [styles.fav, { transform: [{ scale: pressed ? 0.92 : 1 }] }, style]}
    >
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={19} color={on ? '#ef4444' : '#111a2b'} />
    </Pressable>
  );
}

/** "3 Beds · 2 Baths · 1,450 sq.ft" */
export function specsLine(p, t) {
  return [p.bedrooms > 0 && `${p.bedrooms} ${t('beds')}`, p.bathrooms > 0 && `${p.bathrooms} ${t('baths')}`, `${p.areaSqft?.toLocaleString('en-IN')} ${t('sqft')}`]
    .filter(Boolean)
    .join('  ·  ');
}

export default function PropertyCard({ p, compact }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const nav = useNavigation();
  return (
    <Card style={{ padding: 10, marginBottom: 16 }}>
      <Pressable onPress={() => nav.navigate('PropertyDetail', { slug: p.slug, id: p._id })}>
        <View style={{ borderRadius: 14, overflow: 'hidden' }}>
          <Image source={{ uri: p.images?.[0]?.url }} style={{ height: compact ? 160 : 210, backgroundColor: colors.skeleton }} contentFit="cover" transition={250} />
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
              <Txt size={11} semibold style={{ color: p.purpose === 'rent' ? '#075985' : '#0f2a4a' }}>
                {p.purpose === 'rent' ? t('forRent') : t('forSale')}
              </Txt>
            </View>
            {p.featured ? (
              <View style={[styles.badge, { backgroundColor: colors.gold, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                <Ionicons name="star" size={10} color="#fff" />
                <Txt size={11} semibold style={{ color: '#fff' }}>Featured</Txt>
              </View>
            ) : null}
          </View>
          <FavoriteButton id={p._id} style={{ position: 'absolute', right: 10, top: 10 }} />
          {p.previousPrice > p.price ? (
            <View style={[styles.badge, { position: 'absolute', left: 10, bottom: 10, backgroundColor: colors.danger, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
              <Ionicons name="trending-down" size={11} color="#fff" />
              <Txt size={11} semibold style={{ color: '#fff' }}>Price drop</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: 6, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt display size={23}>
              {formatPriceShort(p.price)}
              {p.purpose === 'rent' ? <Txt muted size={13} style={{ fontFamily: fonts.medium }}>{t('perMonth')}</Txt> : null}
            </Txt>
            <Txt muted size={11} semibold style={{ letterSpacing: 0.8 }}>{titleCase(p.type).toUpperCase()}</Txt>
          </View>
          <Txt semibold numberOfLines={1} style={{ marginTop: 4 }}>{p.title}</Txt>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Txt muted size={13} numberOfLines={1} style={{ flex: 1 }}>
              {p.address?.locality}, {p.address?.city}
            </Txt>
            {p.distanceKm != null ? (
              <View style={{ backgroundColor: colors.subtle, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Txt size={11} semibold>{p.distanceKm} km</Txt>
              </View>
            ) : null}
          </View>
          <Txt muted size={13} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
            {specsLine(p, t)}
          </Txt>
        </View>
      </Pressable>
      {!compact ? (
        <View style={{ paddingHorizontal: 6, paddingTop: 12, paddingBottom: 4 }}>
          <ShowContact property={p} small />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  badges: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  fav: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
