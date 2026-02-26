import {
    View, Text, StyleSheet, Image, ActivityIndicator, ScrollView,
    TouchableOpacity, Pressable, Alert, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../../lib/api';
import StatusBanner, { friendlyError } from '../../components/StatusBanner';
import i18n from '../../lib/i18n';

export default function MatchedUserProfileScreen() {
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const [profile, setProfile] = useState<any>(null);
    const [wardrobe, setWardrobe] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bannerMsg, setBannerMsg] = useState<string | null>(null);
    const [detailItem, setDetailItem] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadUserProfile();
        }, [userId])
    );

    async function loadUserProfile() {
        if (!userId) return;
        try {
            setLoading(true);
            // Fetch user profile
            const profileData = await authenticatedFetch(`/profiles/${userId}`);
            setProfile(profileData);

            // Fetch their wardrobe
            const wardrobeData = await authenticatedFetch(`/items/user/${userId}`);
            setWardrobe(wardrobeData?.items || []);

            // Fetch their reviews
            const reviewsData = await authenticatedFetch(`/reviews/${userId}`);
            setReviews(reviewsData?.reviews || []);
        } catch (error: any) {
            setBannerMsg(friendlyError(error?.message || String(error)));
        } finally {
            setLoading(false);
        }
    }

    async function handleUnmatch() {
        Alert.alert(
            'Remove Match',
            'Are you sure you want to unmatch with this person?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unmatch',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await authenticatedFetch(`/swipes/unmatch/${userId}`, {
                                method: 'POST',
                            });
                            router.back();
                        } catch (e: any) {
                            setBannerMsg(friendlyError(e?.message || 'Unmatch failed'));
                        }
                    },
                },
            ]
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary.forestGreen} />
                </View>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.safe}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <View style={styles.center}>
                    <Text style={styles.errorText}>Profile not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBanner message={bannerMsg} onDismiss={() => setBannerMsg(null)} />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header with back button */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{i18n.t('profile')}</Text>
                    <TouchableOpacity onPress={handleUnmatch}>
                        <Ionicons name="close-circle-outline" size={24} color="#E74C3C" />
                    </TouchableOpacity>
                </View>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{
                                uri: profile?.avatar_url || 'https://i.pravatar.cc/150?img=12',
                            }}
                            style={styles.avatar}
                        />
                    </View>

                    <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
                    {profile?.location && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={14} color={Colors.neutrals.gray} />
                            <Text style={styles.location}>{profile.location}</Text>
                        </View>
                    )}

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{profile?.items_swapped || 0}</Text>
                            <Text style={styles.statLabel}>Swaps</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{profile?.eco_points || 0}</Text>
                            <Text style={styles.statLabel}>🌿 Points</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || 'N/A'}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                        <Pressable 
                            style={styles.primaryBtn}
                            onPress={() => router.push(`/chat/${userId}`)}
                        >
                            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                            <Text style={styles.btnText}>Message</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryBtn} onPress={handleUnmatch}>
                            <Ionicons name="close-circle-outline" size={18} color={Colors.secondary.deepMaroon} />
                            <Text style={[styles.btnText, { color: Colors.secondary.deepMaroon }]}>Unmatch</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Reviews Section */}
                {reviews.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="star" size={18} color={Colors.primary.forestGreen} />
                            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
                        </View>
                        {reviews.slice(0, 3).map((review, idx) => (
                            <View key={idx} style={styles.reviewCard}>
                                <View style={styles.reviewTop}>
                                    <View>
                                        <Text style={styles.reviewerName}>{review.reviewer_name || 'Anonymous'}</Text>
                                        <View style={styles.ratingStars}>
                                            {[...Array(5)].map((_, i) => (
                                                <Ionicons
                                                    key={i}
                                                    name={i < review.rating ? 'star' : 'star-outline'}
                                                    size={12}
                                                    color="#F4C430"
                                                />
                                            ))}
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.reviewText} numberOfLines={2}>{review.comment}</Text>
                            </View>
                        ))}
                        {reviews.length > 3 && (
                            <TouchableOpacity style={styles.seeAllBtn}>
                                <Text style={styles.seeAllText}>See all {reviews.length} reviews →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Wardrobe Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="shirt-outline" size={18} color={Colors.primary.forestGreen} />
                        <Text style={styles.sectionTitle}>Wardrobe ({wardrobe.length})</Text>
                    </View>

                    {wardrobe.length > 0 ? (
                        <View style={styles.wardrobeGrid}>
                            {wardrobe.map((item, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.wardrobeSlot}
                                    onPress={() => setDetailItem(item)}
                                >
                                    {item.images?.[0] ? (
                                        <Image
                                            source={{ uri: item.images[0] }}
                                            style={styles.wardrobeImage}
                                        />
                                    ) : (
                                        <View style={[styles.wardrobeImage, styles.wardrobeImageFallback]}>
                                            <Ionicons name="shirt-outline" size={24} color={Colors.neutrals.gray} />
                                        </View>
                                    )}
                                    <Text style={styles.wardrobeTitle} numberOfLines={1}>{item.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>No items in wardrobe yet</Text>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Item Detail Modal */}
            {detailItem && (
                <Modal visible={!!detailItem} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setDetailItem(null)}>
                                    <Ionicons name="close" size={24} color={Colors.secondary.deepMaroon} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {detailItem.images?.[0] && (
                                    <Image
                                        source={{ uri: detailItem.images[0] }}
                                        style={styles.modalImage}
                                    />
                                )}
                                <View style={styles.modalDetails}>
                                    <Text style={styles.modalTitle}>{detailItem.title}</Text>
                                    <View style={styles.tagRow}>
                                        {[detailItem.brand, detailItem.size, detailItem.condition].map((tag, i) => (
                                            tag && (
                                                <View key={i} style={styles.tag}>
                                                    <Text style={styles.tagText}>{tag}</Text>
                                                </View>
                                            )
                                        ))}
                                    </View>
                                    {detailItem.description && (
                                        <>
                                            <Text style={styles.modalSectionTitle}>About</Text>
                                            <Text style={styles.descriptionText}>{detailItem.description}</Text>
                                        </>
                                    )}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    container: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: Colors.secondary.deepMaroon },
    backBtn: { padding: 8 },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.secondary.deepMaroon,
    },

    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#E0DDD8',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.secondary.deepMaroon,
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 16,
    },
    location: {
        fontSize: 13,
        color: Colors.neutrals.gray,
    },

    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.primary.forestGreen,
    },
    statLabel: {
        fontSize: 11,
        color: Colors.neutrals.gray,
        marginTop: 4,
        fontWeight: '500',
    },

    actionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        paddingHorizontal: 16,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: Colors.primary.forestGreen,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: Colors.secondary.deepMaroon,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    btnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.secondary.deepMaroon,
    },

    reviewCard: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#F4C430',
    },
    reviewTop: {
        marginBottom: 8,
    },
    reviewerName: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.secondary.deepMaroon,
    },
    ratingStars: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 4,
    },
    reviewText: {
        fontSize: 12,
        color: Colors.neutrals.gray,
        lineHeight: 18,
    },
    seeAllBtn: {
        paddingVertical: 10,
    },
    seeAllText: {
        color: Colors.primary.forestGreen,
        fontWeight: '600',
        fontSize: 13,
    },

    wardrobeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    wardrobeSlot: {
        width: '31%',
        alignItems: 'center',
    },
    wardrobeImage: {
        width: '100%',
        aspectRatio: 3 / 4,
        borderRadius: 10,
        backgroundColor: '#E0DDD8',
        marginBottom: 8,
    },
    wardrobeImageFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    wardrobeTitle: {
        fontSize: 11,
        color: Colors.secondary.deepMaroon,
        fontWeight: '500',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: Colors.neutrals.gray,
        textAlign: 'center',
        paddingVertical: 20,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'flex-end',
    },
    modalImage: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    modalDetails: {
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.secondary.deepMaroon,
        marginBottom: 8,
    },
    tagRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: Colors.neutrals.beige,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 12,
        color: Colors.secondary.deepMaroon,
        fontWeight: '500',
    },
    modalSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.secondary.deepMaroon,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 13,
        color: Colors.neutrals.gray,
        lineHeight: 20,
    },
});
