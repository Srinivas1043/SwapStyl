import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authenticatedFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import StatusBanner, { friendlyError } from '../../components/StatusBanner';

const DEAL_COLORS: Record<string, string> = {
    interested: '#8B6000',
    negotiating: Colors.secondary.deepMaroon,
    deal_agreed: Colors.primary.forestGreen,
    completed: '#27ae60',
    cancelled: '#999',
};
const DEAL_LABELS: Record<string, string> = {
    interested: '🤝 Interested',
    negotiating: '💬 In talks',
    deal_agreed: '✅ Deal agreed',
    completed: '🎉 Swapped!',
    cancelled: '❌ Cancelled',
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

export default function ChatsScreen() {
    const router = useRouter();
    const [convs, setConvs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bannerMsg, setBannerMsg] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        load();

        const channel = supabase
            .channel('chats_inbox')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'conversations'
            }, () => {
                // When any conversation we are part of updates, reload the list to get new messages/status
                load();
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []));

    async function load() {
        try {
            const data = await authenticatedFetch('/conversations');
            setConvs(data || []);
        } catch (e: any) {
            setBannerMsg(friendlyError(e?.message || String(e)));
        } finally {
            setLoading(false);
        }
    }

    function renderItem({ item: conv }: { item: any }) {
        const other = conv.other_user;
        const lastMsg = conv.last_message;
        const status = conv.status || 'interested';
        const unread = conv.my_unread || 0;

        const previewText = lastMsg
            ? (lastMsg.is_deleted ? 'Message removed'
                : lastMsg.type === 'item_proposal' ? '👕 Shared an item'
                    : lastMsg.type === 'system' ? lastMsg.content
                        : lastMsg.content)
            : 'Say hello!';

        return (
            <View style={s.rowWrapper}>
                {/* Avatar — SEPARATE from the chat row touch area */}
                <TouchableOpacity
                    style={s.avatarWrapper}
                    onPress={() => other?.id && router.push(`/profile/${other.id}`)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                    {other?.avatar_url
                        ? <Image source={{ uri: other.avatar_url }} style={s.avatar} resizeMode="cover" />
                        : <View style={[s.avatar, s.avatarFallback]}>
                            <Text style={s.avatarInitial}>{(other?.full_name || '?')[0].toUpperCase()}</Text>
                        </View>
                    }
                    {other?.is_verified && (
                        <View style={s.verifiedDot}>
                            <Text style={s.verifiedDotText}>✓</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Chat content row — tap opens chat */}
                <TouchableOpacity
                    style={s.row}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/chat/${conv.id}`)}
                >
                    {/* Content */}
                    <View style={s.content}>
                        <View style={s.topRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                                <Text style={s.name} numberOfLines={1}>{other?.full_name || other?.username || 'Unknown'}</Text>
                                {other?.is_verified && (
                                    <View style={s.verifiedBadgeInline}>
                                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>✓</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={s.time}>{lastMsg ? timeAgo(lastMsg.created_at) : ''}</Text>
                        </View>
                        <View style={s.bottomRow}>
                            <Text style={[s.preview, unread > 0 && s.previewBold]} numberOfLines={1}>
                                {previewText}
                            </Text>
                            {unread > 0 && (
                                <View style={s.unreadBadge}>
                                    <Text style={s.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <StatusBanner message={bannerMsg} onDismiss={() => setBannerMsg(null)} />

            <View style={s.header}>
                <Text style={s.headerTitle}>Chats & Deals</Text>
                {convs.length > 0 && (
                    <View style={s.countBadge}>
                        <Text style={s.countText}>{convs.length}</Text>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={s.center}><ActivityIndicator color={Colors.primary.forestGreen} size="large" /></View>
            ) : convs.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="chatbubbles-outline" size={56} color="#DDD" />
                    <Text style={s.emptyTitle}>No conversations yet</Text>
                    <Text style={s.emptySubtitle}>Right-swipe an item to start a deal!</Text>
                </View>
            ) : (
                <FlatList
                    data={convs}
                    keyExtractor={c => c.id}
                    renderItem={renderItem}
                    ItemSeparatorComponent={() => <View style={s.sep} />}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    onRefresh={load}
                    refreshing={loading}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#EDEDEA',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.secondary.deepMaroon, flex: 1 },
    countBadge: {
        backgroundColor: Colors.primary.forestGreen, borderRadius: 12,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', maxWidth: 220 },

    rowWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
        backgroundColor: '#fff',
        gap: 12,
    },
    row: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 16,
        paddingVertical: 12,
        gap: 12,
    },
    avatarWrapper: {
        width: 56, height: 56, borderRadius: 28,
        overflow: 'visible', flexShrink: 0,
        backgroundColor: '#F0F0F0',
        position: 'relative',
    },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarFallback: { backgroundColor: Colors.secondary.deepMaroon, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: '#fff', fontSize: 20, fontWeight: '700' },
    verifiedDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1DA1F2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    verifiedDotText: { color: '#fff', fontSize: 8, fontWeight: '700' },
    verifiedBadgeInline: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#1DA1F2',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    content: { flex: 1, gap: 4 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 15, fontWeight: '700', color: Colors.secondary.deepMaroon, flex: 1 },
    time: { fontSize: 12, color: '#999' },
    bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    preview: { fontSize: 13, color: '#666', flex: 1 },
    previewBold: { color: Colors.secondary.deepMaroon, fontWeight: '600' },
    sep: { height: 1, backgroundColor: '#F0EDE8', marginLeft: 68 },
    unreadBadge: {
        backgroundColor: Colors.primary.forestGreen,
        borderRadius: 10, width: 20, height: 20,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
