import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../../lib/api';

const ICONS = {
    swapHistory: '↺',
    reviews: '☆',
    settings: '⚙',
    logout: '↩',
    chevron: '›',
    star: '★',
};

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [myItems, setMyItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    async function loadProfile() {
        try {
            const [profileData, itemsData] = await Promise.all([
                authenticatedFetch('/profiles/me'),
                authenticatedFetch('/items/my'),
            ]);
            setProfile(profileData);
            setMyItems(itemsData || []);
        } catch (error) {
            console.log('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function signOut() {
        // Sign out from Supabase — root _layout onAuthStateChange will clear session state
        await supabase.auth.signOut();
        // Navigate explicitly to login so user lands on login, not home tabs
        router.replace('/(auth)/login');
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.secondary.deepMaroon} />
                </View>
            </SafeAreaView>
        );
    }

    const stats = [
        { label: 'Items Swapped', value: profile?.items_swapped ?? 0 },
        { label: 'Points', value: profile?.points ?? 0 },
        { label: 'Items Listed', value: profile?.items_listed ?? 0 },
    ];

    const menuItems = [
        { icon: ICONS.swapHistory, label: 'Swap History', route: '/history' },
        { icon: ICONS.reviews, label: 'Reviews', route: '/reviews/me' },
        { icon: ICONS.settings, label: 'Settings', route: '/settings' },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Profile Header ── */}
                <View style={styles.headerRow}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{
                                uri: profile?.avatar_url || 'https://i.pravatar.cc/150?img=12',
                            }}
                            style={styles.avatar}
                        />
                    </View>

                    <View style={styles.headerInfo}>
                        <Text style={styles.name}>
                            {profile?.full_name || 'Your Name'}
                        </Text>
                        {profile?.username ? (
                            <Text style={styles.username}>@{profile.username}</Text>
                        ) : null}
                        <Text style={styles.location}>
                            {profile?.location || 'Location not set'}
                        </Text>
                        <View style={styles.headerActions}>
                            <View style={styles.ratingBadge}>
                                <Text style={styles.starIcon}>{ICONS.star}</Text>
                                <Text style={styles.ratingText}>
                                    {profile?.rating ? Number(profile.rating).toFixed(1) : '4.8'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editProfileBtn}
                                onPress={() => router.push('/edit-profile')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="pencil-outline" size={13} color={Colors.secondary.deepMaroon} />
                                <Text style={styles.editProfileText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    {stats.map((stat, idx) => (
                        <View
                            key={stat.label}
                            style={[styles.statCell, idx < stats.length - 1 && styles.statDivider]}
                        >
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Wardrobe ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Wardrobe</Text>
                        <TouchableOpacity
                            style={styles.addItemButton}
                            activeOpacity={0.7}
                            onPress={() => router.push('/(tabs)/upload')}
                        >
                            <Ionicons name="add" size={14} color={Colors.primary.forestGreen} />
                            <Text style={styles.addItemText}>Add Item</Text>
                        </TouchableOpacity>
                    </View>

                    {myItems.length === 0 ? (
                        /* Empty state */
                        <Pressable style={styles.emptyWardrobe} onPress={() => router.push('/(tabs)/upload')}>
                            <Ionicons name="shirt-outline" size={32} color="#BBBBBB" />
                            <Text style={styles.emptyWardrobeText}>No items yet</Text>
                            <Text style={styles.emptyWardrobeSub}>Tap to add your first item</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.wardrobeGrid}>
                            {myItems.map((item) => (
                                <Pressable
                                    key={item.id}
                                    style={styles.wardrobeCard}
                                    onPress={() => router.push(`/item/${item.id}`)}
                                >
                                    {item.images?.[0] ? (
                                        <Image
                                            source={{ uri: item.images[0] }}
                                            style={{ width: '100%', height: '100%', borderRadius: 10 }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.wardrobeCardPlaceholder}>
                                            <Ionicons name="shirt-outline" size={24} color="#BBB" />
                                        </View>
                                    )}
                                    {item.status === 'pending_review' && (
                                        <View style={styles.pendingBadge}>
                                            <Text style={styles.pendingBadgeText}>⏳ Review</Text>
                                        </View>
                                    )}
                                    {item.status === 'swapped' && (
                                        <View style={styles.swappedBadge}>
                                            <Text style={styles.swappedBadgeText}>✅ Swapped</Text>
                                        </View>
                                    )}
                                    <View style={styles.wardrobeCardOverlay}>
                                        <Text style={styles.wardrobeCardTitle} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Menu Items ── */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, idx) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[
                                styles.menuItem,
                                idx < menuItems.length - 1 && styles.menuItemBorder,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => item.route && router.push(item.route as any)}
                        >
                            <Text style={styles.menuIcon}>{item.icon}</Text>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={styles.menuChevron}>{ICONS.chevron}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Logout ── */}
                <TouchableOpacity
                    style={styles.logoutItem}
                    onPress={signOut}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.menuIcon, styles.logoutIcon]}>{ICONS.logout}</Text>
                    <Text style={[styles.menuLabel, styles.logoutLabel]}>Logout</Text>
                    <Text style={styles.menuChevron}>{ICONS.chevron}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.neutrals.beige,
    },
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Header ──────────────────────────────────────────
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
        marginRight: 16,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 2,
        borderColor: Colors.neutrals.white,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.secondary.deepMaroon,
        marginBottom: 3,
    },
    location: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
    },
    username: {
        fontSize: 12,
        color: Colors.primary.forestGreen,
        marginBottom: 2,
        fontWeight: '500',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary.deepMaroon,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        gap: 4,
    },
    starIcon: {
        color: '#FFD700',
        fontSize: 13,
    },
    ratingText: {
        color: Colors.neutrals.white,
        fontSize: 13,
        fontWeight: '600',
    },

    // ── Stats ────────────────────────────────────────────
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.neutrals.white,
        borderRadius: 14,
        paddingVertical: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    statCell: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        borderRightWidth: 1,
        borderRightColor: '#E8E8E8',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.secondary.deepMaroon,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: '#888',
        textAlign: 'center',
    },

    // ── Wardrobe ─────────────────────────────────────────
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.neutrals.black,
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: Colors.primary.forestGreen,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    addItemText: {
        fontSize: 13,
        color: Colors.primary.forestGreen,
        fontWeight: '600',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    editProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: Colors.secondary.deepMaroon,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    editProfileText: {
        fontSize: 12,
        color: Colors.secondary.deepMaroon,
        fontWeight: '600',
    },
    wardrobeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    wardrobeCard: {
        width: '30%',
        aspectRatio: 1,
        backgroundColor: Colors.neutrals.betterBeige,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    wardrobeCardPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wardrobeCardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    wardrobeCardTitle: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    pendingBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(180,120,0,0.85)',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    pendingBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
    },
    swappedBadge: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: 'rgba(39, 174, 96, 0.85)', // forest green with opacity
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    swappedBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
    },
    emptyWardrobe: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        borderRadius: 12,
        backgroundColor: Colors.neutrals.betterBeige,
        borderWidth: 1.5,
        borderColor: '#E0DDD8',
        borderStyle: 'dashed',
        gap: 6,
    },
    emptyWardrobeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#999',
    },
    emptyWardrobeSub: {
        fontSize: 12,
        color: '#BBB',
    },

    // ── Menu ─────────────────────────────────────────────
    menuSection: {
        backgroundColor: Colors.neutrals.white,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuIcon: {
        fontSize: 18,
        color: '#444',
        marginRight: 14,
        width: 22,
        textAlign: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        color: '#222',
        fontWeight: '500',
    },
    menuChevron: {
        fontSize: 22,
        color: '#BBBBBB',
        fontWeight: '300',
    },

    // ── Logout ───────────────────────────────────────────
    logoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.neutrals.white,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    logoutIcon: {
        color: Colors.secondary.deepMaroon,
    },
    logoutLabel: {
        color: Colors.secondary.deepMaroon,
    },
});
