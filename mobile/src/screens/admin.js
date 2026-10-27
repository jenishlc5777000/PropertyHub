import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, formatINR, formatPriceShort, titleCase } from '@propertyhub/shared';
import { api } from '../api';
import { useTheme } from '../theme';
import OsmMap from '../components/OsmMap';
import { Button, Card, Chip, EmptyState, ErrorState, ListSkeleton, Sheet, Txt } from '../components/ui';

const REJECT_REASONS = [
  'Photos are unclear or not of the actual property',
  'Price or details look incorrect',
  'Duplicate of an existing listing',
  'Phone number or email written in the description',
  'Location pin does not match the address',
];

/** Admin review queue: ads posted by owners/agents wait here until approved or rejected. */
export function AdminReviewScreen({ navigation }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const q = useQuery({ queryKey: ['adminProps', 'pending'], queryFn: () => api.admin.properties({ status: 'pending', limit: 50 }) });
  const done = (msg) => {
    setOpen(null);
    setRejecting(false);
    setReason('');
    ['adminProps', 'adminStats', 'properties', 'featured'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    Alert.alert('Done', msg);
  };
  const approve = useMutation({ mutationFn: api.admin.approve, onSuccess: () => done('Approved — the ad is now live.'), onError: (e) => Alert.alert('Error', apiErrorMessage(e)) });
  const reject = useMutation({ mutationFn: ({ id, r }) => api.admin.reject(id, r), onSuccess: () => done('Rejected — the owner has been notified.'), onError: (e) => Alert.alert('Error', apiErrorMessage(e)) });

  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const p = open;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={q.data.items}
        keyExtractor={(x) => x._id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.accent} />}
        ListHeaderComponent={q.data.items.length ? <Txt muted size={13} style={{ marginBottom: 10 }}>{q.data.meta.total} waiting · oldest first</Txt> : null}
        ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="All caught up" text="New ads appear here and go live only after you approve them." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => setOpen(item)}>
            <Card style={{ marginBottom: 12, padding: 12, flexDirection: 'row', gap: 12 }}>
              <Image source={{ uri: item.images[0]?.url }} style={{ width: 80, height: 80, borderRadius: 10 }} />
              <View style={{ flex: 1 }}>
                <Txt bold numberOfLines={2}>{item.title}</Txt>
                <Txt muted size={12}>{formatPriceShort(item.price)} · {titleCase(item.type)} · {item.address.locality}</Txt>
                <Txt muted size={12}>by {item.owner?.name}{item.approvedAt ? ' · re-submitted' : ''}</Txt>
              </View>
            </Card>
          </Pressable>
        )}
      />
      <Sheet visible={Boolean(p)} onClose={() => { setOpen(null); setRejecting(false); }} title="Review listing">
        {p ? (
          <ScrollView style={{ maxHeight: 600 }} keyboardShouldPersistTaps="handled">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {p.images.map((img) => <Image key={img.url} source={{ uri: img.url }} style={{ width: 220, height: 150, borderRadius: 12 }} />)}
            </ScrollView>
            <Txt bold size={18} style={{ marginTop: 12 }}>{p.title}</Txt>
            <Txt bold size={20} style={{ color: colors.accent }}>{formatINR(p.price)}{p.purpose === 'rent' ? ' /month' : ''}</Txt>
            <Txt muted size={13}>{titleCase(p.type)} for {p.purpose} · {p.bedrooms} bed · {p.bathrooms} bath · {p.areaSqft} sq.ft · {titleCase(p.furnishing)}</Txt>
            <Txt muted size={13} style={{ marginTop: 4 }}>{p.address.line}, {p.address.locality}, {p.address.city} {p.address.pincode}</Txt>
            <OsmMap properties={[p]} style={{ height: 160, borderRadius: 12, marginTop: 10 }} />
            <Txt size={14} style={{ marginTop: 10 }}>{p.description}</Txt>
            <Card style={{ marginTop: 10, padding: 12 }}>
              <Txt bold size={13}>Posted by {p.owner?.name}</Txt>
              <Txt muted size={12}>📞 {p.contact.phone} · ✉ {p.contact.email}</Txt>
            </Card>
            {!rejecting ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button title="Approve" icon="checkmark" style={{ flex: 1 }} loading={approve.isPending} onPress={() => approve.mutate(p._id)} />
                <Button title="Reject" icon="close" variant="outline" style={{ flex: 1 }} onPress={() => setRejecting(true)} />
              </View>
            ) : (
              <View style={{ marginTop: 14, gap: 8 }}>
                <Txt bold size={14}>Reason (sent to the owner)</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {REJECT_REASONS.map((r) => <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />)}
                </View>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Or write your own reason"
                  placeholderTextColor={colors.muted}
                  multiline
                  maxLength={300}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, color: colors.text, minHeight: 60 }}
                />
                <Button title="Reject listing" variant="danger" disabled={!reason.trim()} loading={reject.isPending} onPress={() => reject.mutate({ id: p._id, r: reason.trim() })} />
                <Button title="Back" variant="ghost" onPress={() => setRejecting(false)} />
              </View>
            )}
            <Button title="Open full page" variant="ghost" onPress={() => { setOpen(null); navigation.navigate('PropertyDetail', { slug: p.slug }); }} />
          </ScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}
