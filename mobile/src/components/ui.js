import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { fonts, shadows, useTheme } from '../theme';

/**
 * Text with the design-system fonts. Bold text at 20px and up (headings, prices) uses the
 * Fraunces display serif; everything else uses Plus Jakarta Sans. Pass display / semibold to override.
 */
export function Txt({ style, muted, bold, semibold, display, size = 15, children, ...rest }) {
  const { colors } = useTheme();
  const serif = display ?? (bold && size >= 20);
  const fontFamily = serif ? fonts.display : bold ? fonts.bold : semibold ? fonts.semibold : fonts.regular;
  return (
    <Text
      style={[
        { color: muted ? colors.muted : colors.text, fontSize: size, fontFamily, letterSpacing: serif ? -0.3 : 0 },
        serif && { lineHeight: Math.round(size * 1.15) },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }) {
  const { colors } = useTheme();
  const v = {
    primary: { bg: colors.accent, fg: '#fff', border: colors.accent },
    dark: { bg: colors.brand, fg: '#fff', border: colors.brand },
    outline: { bg: colors.card, fg: colors.text, border: colors.border },
    light: { bg: '#ffffff', fg: '#111a2b', border: '#ffffff' },
    danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
    whatsapp: { bg: colors.whatsapp, fg: '#fff', border: colors.whatsapp },
    ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: 9, paddingHorizontal: 14 },
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} size="small" /> : icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
      {title ? <Text style={{ color: v.fg, fontFamily: fonts.semibold, fontSize: small ? 13 : 15 }}>{title}</Text> : null}
    </Pressable>
  );
}

export function Card({ style, children, ...rest }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card, borderColor: colors.border }, style]} {...rest}>
      {children}
    </View>
  );
}

export function Input({ label, error, style, ...rest }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Txt size={13} semibold style={{ marginBottom: 6, color: colors.body }}>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: error ? colors.danger : colors.border, fontFamily: fonts.regular }, style]}
        {...rest}
      />
      {error ? <Txt size={12} style={{ color: colors.danger, marginTop: 4 }}>{error}</Txt> : null}
    </View>
  );
}

export function Chip({ label, active, onPress, style }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? colors.chipActiveBg : colors.border, backgroundColor: active ? colors.chipActiveBg : colors.card }, style]}
    >
      <Text style={{ color: active ? colors.chipActiveText : colors.text, fontSize: 13, fontFamily: fonts.semibold }}>{label}</Text>
    </Pressable>
  );
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  const { colors } = useTheme();
  const op = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity: op }, style]} />;
}

export function CardSkeleton() {
  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <Skeleton height={190} radius={0} />
      <View style={{ padding: 14, gap: 8 }}>
        <Skeleton width="40%" height={20} />
        <Skeleton width="80%" />
        <Skeleton width="60%" />
      </View>
    </Card>
  );
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: rows }, (_, i) => <CardSkeleton key={i} />)}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, text, action }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <View style={{ backgroundColor: colors.accentSoft, padding: 18, borderRadius: 999, marginBottom: 14 }}>
        <Ionicons name={icon} size={34} color={colors.accent} />
      </View>
      <Txt bold size={17} style={{ textAlign: 'center' }}>{title || t('empty')}</Txt>
      {text ? <Txt muted style={{ textAlign: 'center', marginTop: 6 }}>{text}</Txt> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const msg = error?.response?.data?.error?.message || (error?.message === 'Network Error' ? 'Cannot reach the server. Check your connection.' : error?.message);
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Txt bold size={17} style={{ marginTop: 10 }}>{t('errorGeneric')}</Txt>
      {msg ? <Txt muted style={{ textAlign: 'center', marginTop: 4 }}>{msg}</Txt> : null}
      {onRetry ? <Button title={t('retry')} variant="outline" onPress={onRetry} style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

export function Sheet({ visible, onClose, title, children }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 }} />
          <View style={styles.sheetHeader}>
            <Txt bold size={18} style={{ flex: 1 }}>{title}</Txt>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function StatusPill({ status }) {
  const { t } = useTranslation();
  const map = {
    pending: ['#fef3c7', '#92400e'],
    approved: ['#d1fae5', '#047857'],
    rejected: ['#fee2e2', '#b91c1c'],
    sold: ['#e2e8f0', '#334155'],
    rented: ['#e2e8f0', '#334155'],
    paid: ['#d1fae5', '#047857'],
    failed: ['#fee2e2', '#b91c1c'],
    refunded: ['#e2e8f0', '#334155'],
  }[status] || ['#e2e8f0', '#334155'];
  return (
    <View style={{ backgroundColor: map[0], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: map[1], fontSize: 11, fontFamily: fonts.bold }}>{t(`status_${status}`, { defaultValue: status })}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 300 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,17,32,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
});
