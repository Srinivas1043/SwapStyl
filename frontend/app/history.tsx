import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { authenticatedFetch } from '../lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const DEAL_COLORS: Record<string, string> = {
    interested: '#8B6000',
    negotiating: Colors.secondary.deepMaroon,
    deal_agreed: Colors.primary.forestGreen,
    completed: '#27ae60',
    cancelled: '#999',
};
const DEAL_LABELS: Record<string, string> = {
    interested: 'In Progress',
    negotiating: 'In Progress',
    deal_agreed: 'Accepted',
    completed: 'Swapped',
    cancelled: 'Cancelled',
};

export default function HistoryScreen() {
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all'); // all | active | completed | cancelled

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        setLoading(true);
        try {
            const data = await authenticatedFetch('/conversations');
            setHistory(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const filteredHistory = history.filter(conv => {
        const s = conv.status || 'interested';
        if (filter === 'all') return true;
        if (filter === 'active') return ['interested', 'negotiating', 'deal_agreed'].includes(s);
        if (filter === 'completed') return s === 'completed';
        if (filter === 'cancelled') return s === 'cancelled';
        return true;
    });

    function renderItem({ item: conv }: { item: any }) {
        const other = conv.other_user;
        const itemData = conv.item;
        const status = conv.status || 'interested';
        const dateStr = conv.completed_at || conv.last_message_at || conv.created_at;
        const date = new Date(dateStr).toLocaleDateString();

        return (
            <TouchableOpacity
                style={s.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/chat/${conv.id}`)}
            >
                <View style={s.cardHeader}>
                    <Text style={s.dateText}>{date}</Text>
                    <View style={[s.badge, { backgroundColor: DEAL_COLORS[status] + '20' }]}>
                        <Text style={[s.badgeText, { color: DEAL_COLORS[status] }]}>{DEAL_LABELS[status]}</Text>
                    </View>
                </View>

                <View style={s.cardBody}>
                    <Image source={{ uri: itemData?.images?.[0] || 'https://via.placeholder.com/150' }} style={s.itemImage} />
                    <View style={s.cardDetails}>
                        <Text style={s.itemTitle} numberOfLines={1}>{itemData?.title || 'Unknown Item'}</Text>
                        <View style={s.userRow}>
                            <Image source={{ uri: other?.avatar_url || 'https://i.pravatar.cc/150' }} style={s.avatar} />
                            <Text style={s.userName}>Swap with {other?.username || other?.full_name || 'User'}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </View>
            </TouchableOpacity>
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
            <View style={s.filterRow}>
                {['all', 'active', 'completed', 'cancelled'].map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[s.filterChip, filter === f && s.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {loading ? (
                <View style={s.center}><ActivityIndicator color={Colors.primary.forestGreen} /></View>
            ) : filteredHistory.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="document-text-outline" size={48} color="#DDD" />
                    <Text style={s.emptyText}>No swaps found in this category.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredHistory}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={s.list}
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
    filterRow: {
        flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        backgroundColor: '#F0EDE8',
    },
    filterChipActive: { backgroundColor: Colors.primary.forestGreen },
    filterText: { fontSize: 13, fontWeight: '600', color: '#888' },
    filterTextActive: { color: '#fff' },
    list: { padding: 16, gap: 12 },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
    },
    dateText: { fontSize: 12, color: '#999', fontWeight: '500' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#EEE' },
    cardDetails: { flex: 1, gap: 4 },
    itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.secondary.deepMaroon },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    avatar: { width: 16, height: 16, borderRadius: 8 },
    userName: { fontSize: 12, color: '#666' },
    emptyText: { fontSize: 14, color: '#999' },
});
