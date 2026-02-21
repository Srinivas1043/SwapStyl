import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
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
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    async function loadProfile() {
        try {
            const data = await authenticatedFetch('/profiles/me');
            setProfile(data);
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
        { label: 'Items Listed', value: profile?.items_listed ?? 0 },
        { label: 'Wishlist', value: profile?.wishlist_count ?? 0 },
    ];

    const wardrobeItems = [0, 1, 2];

    const menuItems = [
        { icon: ICONS.swapHistory, label: 'Swap History' },
        { icon: ICONS.reviews, label: 'Reviews' },
        { icon: ICONS.settings, label: 'Settings' },
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
                        <Text style={styles.location}>
                            {profile?.location || 'Your Location'}
                        </Text>
                        <View style={styles.ratingBadge}>
                            <Text style={styles.starIcon}>{ICONS.star}</Text>
                            <Text style={styles.ratingText}>
                                {profile?.rating ? Number(profile.rating).toFixed(1) : '4.8'}
                            </Text>
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
                        <TouchableOpacity style={styles.addItemButton} activeOpacity={0.7}>
                            <Text style={styles.addItemText}>+ Add Item</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.wardrobeGrid}>
                        {wardrobeItems.map((idx) => (
                            <View key={idx} style={styles.wardrobeCard} />
                        ))}
                    </View>
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
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    addItemText: {
        fontSize: 13,
        color: '#444',
        fontWeight: '500',
    },
    wardrobeGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    wardrobeCard: {
        flex: 1,
        height: 110,
        backgroundColor: Colors.neutrals.betterBeige,
        borderRadius: 10,
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
