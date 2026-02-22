import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { authenticatedFetch } from '../lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WishlistScreen() {
    const router = useRouter();
    const [authLoading, setAuthLoading] = useState(false);
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWishlist();
    }, []);

    async function loadWishlist() {
        setLoading(true);
        try {
            const data = await authenticatedFetch('/wishlists');
            setWishlist(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function renderItem({ item: saveInfo }: { item: any }) {
        const item = saveInfo.items;
        if (!item) return null;

        return (
            <TouchableOpacity
                style={s.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/item/${item.id}`)}
            >
                <Image
                    source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
                    style={s.image}
                />
                <View style={s.overlay}>
                    <Text style={s.brand} numberOfLines={1}>{item.brand}</Text>
                    <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                </View>
                <View style={s.heartBox}>
                    <Ionicons name="heart" size={20} color={Colors.secondary.deepMaroon} />
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
                <Text style={s.headerTitle}>My Wishlist</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={s.center}><ActivityIndicator color={Colors.primary.forestGreen} /></View>
            ) : wishlist.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="heart-outline" size={64} color="#DDD" />
                    <Text style={s.emptyTitle}>Your wishlist is empty</Text>
                    <Text style={s.emptySubtitle}>Items you save will appear here.</Text>
                </View>
            ) : (
                <FlatList
                    data={wishlist}
                    keyExtractor={w => w.id}
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
    list: { padding: 12 },
    row: { gap: 12, marginBottom: 12 },
    card: {
        flex: 1,
        aspectRatio: 0.8,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    overlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', padding: 10,
    },
    brand: { color: '#ddd', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    title: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 },
    heartBox: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: 18, color: Colors.secondary.deepMaroon, fontWeight: '700', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#888' },
});
