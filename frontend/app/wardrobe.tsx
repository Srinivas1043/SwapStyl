import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { authenticatedFetch } from '../lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function WardrobeScreen() {
    const router = useRouter();
    const [myItems, setMyItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWardrobe();
    }, []);

    async function loadWardrobe() {
        setLoading(true);
        try {
            const data = await authenticatedFetch(`/items/my`);
            setMyItems(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function renderItem({ item }: { item: any }) {
        return (
            <TouchableOpacity
                style={s.wardrobeCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/item/${item.id}`)}
            >
                <View style={s.wardrobeImageContainer}>
                    {item.images?.[0] ? (
                        <Image
                            source={{ uri: item.images[0] }}
                            style={s.wardrobeImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={s.wardrobeCardPlaceholder}>
                            <Ionicons name="shirt-outline" size={32} color="#BBB" />
                        </View>
                    )}
                    {item.status === 'pending_review' && (
                        <View style={s.pendingBadge}>
                            <Text style={s.pendingBadgeText}>Review</Text>
                        </View>
                    )}
                    {item.status === 'swapped' && (
                        <View style={s.swappedBadge}>
                            <Text style={s.swappedBadgeText}>Swapped</Text>
                        </View>
                    )}
                </View>
                <View style={s.wardrobeCardInfo}>
                    <Text style={s.wardrobeCardBrand} numberOfLines={1}>
                        {item.brand || 'Apparel'}
                    </Text>
                    <Text style={s.wardrobeCardTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {item.size ? (
                        <Text style={s.wardrobeCardSize}>Size {item.size}</Text>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>My Wardrobe</Text>
                <View style={s.headerActions}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/upload')} style={s.addBtn}>
                        <Ionicons name="add" size={20} color={Colors.primary.forestGreen} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={s.center}><ActivityIndicator color={Colors.primary.forestGreen} /></View>
            ) : myItems.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="shirt-outline" size={64} color="#DDD" />
                    <Text style={s.emptyTitle}>Your wardrobe is empty</Text>
                    <Text style={s.emptySubtitle}>Upload your first item to start swapping!</Text>
                    <TouchableOpacity
                        style={s.uploadBtn}
                        onPress={() => router.push('/(tabs)/upload')}
                    >
                        <Text style={s.uploadBtnText}>Add Item</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={myItems}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    renderItem={renderItem}
                    contentContainerStyle={s.list}
                    columnWrapperStyle={s.row}
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
        borderBottomWidth: 1, borderBottomColor: '#EEE'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    headerActions: { padding: 4, width: 32, alignItems: 'flex-end' },
    addBtn: { padding: 4, backgroundColor: '#E8F5E9', borderRadius: 20 },
    list: { padding: 16 },
    row: { gap: 16, marginBottom: 16 },
    wardrobeCard: {
        width: '48%',
        backgroundColor: Colors.neutrals.white,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 5, elevation: 2,
    },
    wardrobeImageContainer: {
        width: '100%', aspectRatio: 0.85,
        backgroundColor: Colors.neutrals.betterBeige, position: 'relative',
    },
    wardrobeImage: { width: '100%', height: '100%' },
    wardrobeCardPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    wardrobeCardInfo: { padding: 10, backgroundColor: Colors.neutrals.white },
    wardrobeCardBrand: { fontSize: 10, color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
    wardrobeCardTitle: { color: Colors.neutrals.black, fontSize: 13, fontWeight: '600', marginBottom: 2 },
    wardrobeCardSize: { fontSize: 11, color: '#666', fontWeight: '500' },
    pendingBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(230, 126, 34, 0.9)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    pendingBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    swappedBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(39, 174, 96, 0.9)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    swappedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyTitle: { fontSize: 18, color: Colors.secondary.deepMaroon, fontWeight: '700', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
    uploadBtn: { backgroundColor: Colors.primary.forestGreen, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    uploadBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
