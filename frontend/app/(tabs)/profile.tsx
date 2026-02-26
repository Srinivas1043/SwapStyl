import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Pressable,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../../lib/api';
import StatusBanner, { friendlyError } from '../../components/StatusBanner';
import i18n from '../../lib/i18n';

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
    const [bannerMsg, setBannerMsg] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    async function loadProfile() {
        try {
            const profileData = await authenticatedFetch('/profiles/me');
            setProfile(profileData);
        } catch (error: any) {
            setBannerMsg(friendlyError(error?.message || String(error)));
        } finally {
            setLoading(false);
        }
    }

    async function signOut() {
        Alert.alert(
            i18n.t('logout') || 'Log out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: i18n.t('logout') || 'Log out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase.auth.signOut();
                        } catch (e: any) {
                            setBannerMsg(friendlyError(e?.message || 'Logout failed'));
                        }
                    },
                },
            ]
        );
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
        { label: i18n.t('ecoPoints'), value: profile?.eco_points ?? 0 },
        { label: i18n.t('wishlist'), value: profile?.wishlist_count ?? 0 },
        { label: 'Items Listed', value: profile?.items_listed ?? 0 },
    ];

    const menuItems = [
        { icon: '👕', label: i18n.t('myWardrobe'), route: '/wardrobe' },
        { icon: '♡', label: 'My Wishlist', route: '/wishlists' },
        { icon: ICONS.swapHistory, label: i18n.t('history'), route: '/history' },
        { icon: ICONS.reviews, label: 'Reviews', route: '/reviews/me' },
        { icon: ICONS.settings, label: i18n.t('settings'), route: '/settings' },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBanner message={bannerMsg} onDismiss={() => setBannerMsg(null)} />
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
                                    {profile?.rating ? Number(profile.rating).toFixed(1) : '0.0'}
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
