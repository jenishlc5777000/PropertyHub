import { useLayoutEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { apiErrorMessage } from '@propertyhub/shared';
import { api } from '../api';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Chip, EmptyState, ErrorState, ListSkeleton, Txt } from '../components/ui';

function Visits() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['visits'], queryFn: () => api.visits.list() });
  const m = useMutation({
    mutationFn: ({ id, status }) => api.visits.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits'] }),
    onError: (e) => Alert.alert(t('errorGeneric'), apiErrorMessage(e)),
  });
  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <FlatList
      data={q.data}
      keyExtractor={(v) => v._id}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.accent} />}
      ListEmptyComponent={<EmptyState icon="calendar-outline" title="No visits scheduled" text="Request a visit from any property page." />}
      renderItem={({ item: v }) => {
        const isAgent = String(v.agent._id) === String(user._id);
        return (
          <Card style={{ marginBottom: 12 }}>
            <Txt bold numberOfLines={1}>{v.property?.title || 'Deleted property'}</Txt>
            <Txt muted size={13} style={{ marginTop: 2 }}>
              {new Date(v.date).toDateString()} · {t(v.slot)} · {isAgent ? `Buyer: ${v.buyer.name}` : `Owner: ${v.agent.name}`}
            </Txt>
            <Txt size={13} bold style={{ marginTop: 6, color: v.status === 'confirmed' ? colors.accent : v.status === 'cancelled' ? colors.danger : colors.warning, textTransform: 'capitalize' }}>{v.status}</Txt>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {isAgent && v.status === 'requested' ? <Button small title="Confirm" onPress={() => m.mutate({ id: v._id, status: 'confirmed' })} /> : null}
              {isAgent && v.status === 'confirmed' ? <Button small variant="outline" title="Mark done" onPress={() => m.mutate({ id: v._id, status: 'done' })} /> : null}
              {['requested', 'confirmed'].includes(v.status) ? <Button small variant="ghost" title={t('cancel')} onPress={() => m.mutate({ id: v._id, status: 'cancelled' })} /> : null}
            </View>
          </Card>
        );
      }}
    />
  );
}

export function InquiriesScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState('messages');
  const q = useQuery({ queryKey: ['inquiries'], queryFn: () => api.inquiries.list(), refetchInterval: 30000 });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 }}>
        <Chip label="Messages" active={tab === 'messages'} onPress={() => setTab('messages')} />
        <Chip label="Visits" active={tab === 'visits'} onPress={() => setTab('visits')} />
      </View>
      {tab === 'visits' ? (
        <Visits />
      ) : q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.accent} />}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No conversations yet" text="Send an inquiry from a property page." />}
          renderItem={({ item: inq }) => {
            const other = inq.role === 'buyer' ? inq.agent : inq.buyer;
            return (
              <Pressable onPress={() => navigation.navigate('Chat', { id: inq._id })}>
                <Card style={{ marginBottom: 10, flexDirection: 'row', gap: 12, padding: 12 }}>
                  <Image source={{ uri: inq.property?.image }} style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: colors.skeleton }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Txt bold={inq.unread} numberOfLines={1} style={{ flex: 1 }}>{other?.name}</Txt>
                      <Txt size={11} bold style={{ color: inq.role === 'agent' ? colors.accent : colors.muted }}>{inq.role === 'agent' ? t('leads') : 'Sent'}</Txt>
                    </View>
                    <Txt muted size={12} numberOfLines={1}>{inq.property?.title}</Txt>
                    <Txt size={13} numberOfLines={1} muted={!inq.unread} bold={inq.unread}>{inq.lastMessage?.text}</Txt>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

export function ChatScreen({ route, navigation }) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const list = useRef(null);
  const q = useQuery({ queryKey: ['inquiry', id], queryFn: () => api.inquiries.get(id), refetchInterval: 10000 });
  const send = useMutation({
    mutationFn: () => api.inquiries.reply(id, text.trim()),
    onSuccess: (d) => {
      qc.setQueryData(['inquiry', id], d);
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      setText('');
    },
    onError: (e) => Alert.alert(t('errorGeneric'), apiErrorMessage(e)),
  });
  const inq = q.data;
  useLayoutEffect(() => {
    if (inq) navigation.setOptions({ title: (inq.role === 'buyer' ? inq.agent : inq.buyer)?.name || '' });
  }, [inq, navigation]);

  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {inq.property ? (
        <Pressable onPress={() => navigation.navigate('PropertyDetail', { slug: inq.property.slug })} style={{ padding: 12, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Image source={{ uri: inq.property.image }} style={{ width: 36, height: 36, borderRadius: 8 }} />
          <Txt size={13} numberOfLines={1} style={{ flex: 1, color: colors.accent }}>{inq.property.title}</Txt>
        </Pressable>
      ) : null}
      <FlatList
        ref={list}
        data={inq.messages}
        keyExtractor={(m) => m._id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: m }) => {
          const mine = String(m.sender) === String(user._id);
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? colors.accent : colors.card, borderRadius: 16, padding: 10, borderWidth: mine ? 0 : 1, borderColor: colors.border }}>
              <Txt style={{ color: mine ? '#fff' : colors.text }}>{m.text}</Txt>
              <Txt size={10} style={{ color: mine ? '#d1fae5' : colors.muted, marginTop: 4 }}>{new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Txt>
            </View>
          );
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
        <TextInput value={text} onChangeText={setText} placeholder={t('typeMessage')} placeholderTextColor={colors.muted} maxLength={1000} multiline style={{ flex: 1, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100 }} />
        <Pressable
          onPress={() => text.trim() && send.mutate()}
          disabled={send.isPending || !text.trim()}
          style={{ backgroundColor: colors.accent, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.5 }}
          accessibilityLabel={t('send')}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
