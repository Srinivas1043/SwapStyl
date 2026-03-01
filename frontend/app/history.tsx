import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { authenticatedFetch } from '../lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS: Record<string, string> = {
    interested: '#8B6000',
    negotiating: Colors.secondary.deepMaroon,
    deal_agreed: Colors.primary.forestGreen,
    completed: '#27ae60',
    cancelled: '#999',
};
const STATUS_LABELS: Record<string, string> = {
    interested: 'In Progress',
    negotiating: 'Negotiating',
    deal_agreed: 'Deal Agreed',
    completed: 'Swapped ✓',
    cancelled: 'Cancelled',
};

export default function HistoryScreen() {
    const router = useRouter();
    const [convs, setConvs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await authenticatedFetch('/conversations');
            setConvs(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const filtered = convs.filter(conv => {
        const s = conv.status || 'interested';
        if (filter === 'all') return true;
        if (filter === 'active') return ['interested', 'negotiating', 'deal_agreed'].includes(s);
        if (filter === 'completed') return s === 'completed';
        if (filter === 'cancelled') return s === 'cancelled';
        return true;
    });

    function renderConv({ item: conv }: { item: any }) {
        const other = conv.other_user;
        const itemData = conv.item;       // Joined from item_id FK
        const status = conv.status || 'interested';
        const dateStr = conv.completed_at || conv.last_message_at || conv.created_at;
        const date = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
        }) : '—';

        const statusColor = STATUS_COLORS[status] || '#999';
        const statusLabel = STATUS_LABELS[status] || status;

        return (
            <View style={s.card}>
                {/* User row — tappable to view their profile */}
                <TouchableOpacity
                    style={s.userRow}
                    onPress={() => other?.id && router.push(`/profile/${other.id}`)}
                    activeOpacity={0.8}
                >
                    {other?.avatar_url
                        ? <Image source={{ uri: other.avatar_url }} style={s.userAvatar} />
                        : <View style={[s.userAvatar, s.userAvatarFallback]}>
                            <Text style={s.userAvatarInitial}>{(other?.full_name || '?')[0].toUpperCase()}</Text>
                        </View>
                    }
                    <View style={{ flex: 1 }}>
                        <Text style={s.userName}>{other?.full_name || other?.username || 'Unknown User'}</Text>
                        <Text style={s.dateText}>{date}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.divider} />

                {/* Item row — tappable to open the chat */}
                <TouchableOpacity
                    style={s.itemRow}
                    onPress={() => router.push(`/chat/${conv.id}`)}
                    activeOpacity={0.8}
                >
                    {itemData?.images?.[0]
                        ? <Image source={{ uri: itemData.images[0] }} style={s.itemImage} />
                        : <View style={[s.itemImage, s.itemImageFallback]}>
                            <Ionicons name="shirt-outline" size={20} color="#BBB" />
                        </View>
                    }
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.itemTitle} numberOfLines={1}>
                            {itemData?.title || 'No item linked'}
                        </Text>
                        {(itemData?.brand || itemData?.size || itemData?.condition) && (
                            <Text style={s.itemMeta} numberOfLines={1}>
                                {[itemData?.brand, itemData?.size, itemData?.condition].filter(Boolean).join('  ·  ')}
                            </Text>
                        )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <Text style={s.title}>Swap History</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
                style={s.filterScroll}
            >
                {[
                    { key: 'all', label: 'All' },
                    { key: 'active', label: 'Active' },
                    { key: 'completed', label: 'Swapped' },
                    { key: 'cancelled', label: 'Cancelled' },
                ].map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[s.filterChip, filter === f.key && s.filterChipActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* List */}
            {loading ? (
                <View style={s.center}><ActivityIndicator color={Colors.primary.forestGreen} size="large" /></View>
            ) : filtered.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="document-text-outline" size={52} color="#DDD" />
                    <Text style={s.emptyTitle}>No swaps here yet</Text>
                    <Text style={s.emptyText}>Your swap history will appear here.</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderConv}
                    contentContainerStyle={s.list}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#EEE',
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },

    filterScroll: { backgroundColor: '#fff', maxHeight: 56 },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
        gap: 8, alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
        backgroundColor: '#F0EDE8',
    },
    filterChipActive: { backgroundColor: Colors.primary.forestGreen },
    filterText: { fontSize: 13, fontWeight: '600', color: '#888' },
    filterTextActive: { color: '#fff' },

    list: { padding: 16, paddingBottom: 32 },

    // Card
    card: {
        backgroundColor: '#fff', borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        overflow: 'hidden',
    },

    // User row (top section)
    userRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    userAvatar: { width: 44, height: 44, borderRadius: 22 },
    userAvatarFallback: {
        backgroundColor: Colors.secondary.deepMaroon,
        alignItems: 'center', justifyContent: 'center',
    },
    userAvatarInitial: { color: '#fff', fontSize: 17, fontWeight: '700' },
    userName: { fontSize: 15, fontWeight: '700', color: Colors.secondary.deepMaroon },
    dateText: { fontSize: 12, color: '#999', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '700' },

    divider: { height: 1, backgroundColor: '#F0EDE8', marginLeft: 16 },

    // Item row (bottom section)
    itemRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    itemImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#F0EDE8' },
    itemImageFallback: { alignItems: 'center', justifyContent: 'center' },
    itemTitle: { fontSize: 14, fontWeight: '600', color: Colors.secondary.deepMaroon },
    itemMeta: { fontSize: 12, color: '#888' },

    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
});
