import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { authenticatedFetch } from '../../lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function MyReviewsScreen() {
    const router = useRouter();
    const [reviews, setReviews] = useState<any[]>([]);
    const [stats, setStats] = useState({ average_rating: 0, total_count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReviews();
    }, []);

    async function loadReviews() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const data = await authenticatedFetch(`/reviews/${user.id}`);
            setReviews(data.reviews || []);
            setStats({
                average_rating: data.average_rating,
                total_count: data.total_count,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function renderItem({ item: review }: { item: any }) {
        const reviewer = review.reviewer;
        const date = new Date(review.created_at).toLocaleDateString();

        return (
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={s.userRow}>
                        <Image source={{ uri: reviewer?.avatar_url || 'https://i.pravatar.cc/150' }} style={s.avatar} />
                        <View>
                            <Text style={s.userName}>{reviewer?.full_name || reviewer?.username || 'User'}</Text>
                            <Text style={s.dateText}>{date}</Text>
                        </View>
                    </View>
                    <View style={s.starsBatch}>
                        <Ionicons name="star" size={14} color="#F1C40F" />
                        <Text style={s.ratingNumber}>{review.rating.toFixed(1)}</Text>
                    </View>
                </View>
                {review.comment ? (
                    <Text style={s.commentText}>{review.comment}</Text>
                ) : null}
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
                <Text style={s.title}>My Reviews</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* List */}
            {loading ? (
                <View style={s.center}><ActivityIndicator color={Colors.primary.forestGreen} /></View>
            ) : reviews.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="star-outline" size={48} color="#DDD" />
                    <Text style={s.emptyText}>You haven't received any reviews yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={s.list}
                    ListHeaderComponent={
                        <View style={s.statsHeader}>
                            <Text style={s.statsRating}>{stats.average_rating}</Text>
                            <View style={s.statsStars}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Ionicons
                                        key={star}
                                        name={star <= Math.round(stats.average_rating) ? "star" : "star-outline"}
                                        size={24}
                                        color="#F1C40F"
                                    />
                                ))}
                            </View>
                            <Text style={s.statsSubtitle}>Based on {stats.total_count} reviews</Text>
                        </View>
                    }
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
    list: { padding: 16, gap: 12 },
    statsHeader: {
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    statsRating: { fontSize: 48, fontWeight: '800', color: Colors.secondary.deepMaroon, marginBottom: 8 },
    statsStars: { flexDirection: 'row', gap: 4, marginBottom: 8 },
    statsSubtitle: { fontSize: 13, color: '#888' },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 12,
    },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE' },
    userName: { fontSize: 14, fontWeight: '600', color: Colors.secondary.deepMaroon },
    dateText: { fontSize: 11, color: '#999', marginTop: 2 },
    starsBatch: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4
    },
    ratingNumber: { fontSize: 12, fontWeight: '700', color: '#B8860B' },
    commentText: { fontSize: 14, color: '#444', lineHeight: 20 },
    emptyText: { fontSize: 14, color: '#999' },
});
