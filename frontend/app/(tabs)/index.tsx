import {
    View, Text, StyleSheet, Pressable, Animated, PanResponder,
    Dimensions, ScrollView, TextInput, Modal, ActivityIndicator,
    Image, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authenticatedFetch } from '../../lib/api';
import StatusBanner, { friendlyError } from '../../components/StatusBanner';
import i18n from '../../lib/i18n';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;
const CARD_H = SCREEN_H * 0.68;
const SWIPE_THRESHOLD = SCREEN_W * 0.3;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Owner { id: string; full_name: string; username: string; avatar_url: string | null; location: string | null; rating: number; }
interface Item {
    id: string; title: string; brand: string; size: string; color: string;
    condition: string; category: string; description: string; images: string[];
    profiles: Owner;
}
interface Filters {
    sort: string; category: string; gender: string; size: string;
    color: string; brand: string; condition: string; radius_km: string;
}

const DEFAULT_FILTERS: Filters = {
    sort: 'newest', category: '', gender: '', size: '',
    color: '', brand: '', condition: '', radius_km: '',
};

const SORT_OPTIONS = ['newest', 'oldest'];
const CATEGORY_OPTIONS = ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Bags', 'Outerwear', 'Dresses'];
const GENDER_OPTIONS = ['Men', 'Women', 'Unisex'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '28', '30', '32', '34', '36', '38', '40'];
const CONDITION_OPTIONS = ['New with tags', 'New without tags', 'Good', 'Fair', 'Poor'];

// ─── SwipeCard component ──────────────────────────────────────────────────────
function SwipeCard({
    item, onSwipeLeft, onSwipeRight, onWishlistToggle,
    isWishlisted, onCardTap, isTop,
}: {
    item: Item; onSwipeLeft: () => void; onSwipeRight: () => void;
    onWishlistToggle: () => void; isWishlisted: boolean;
    onCardTap: () => void; isTop: boolean;
}) {
    const position = useRef(new Animated.ValueXY()).current;
    const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
    const tap = useRef(false);

    const rotate = position.x.interpolate({
        inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
        outputRange: ['-8deg', '0deg', '8deg'],
        extrapolate: 'clamp',
    });
    const likeOpacity = position.x.interpolate({ inputRange: [-50, 0, 80], outputRange: [0, 0, 1], extrapolate: 'clamp' });
    const nopeOpacity = position.x.interpolate({ inputRange: [-80, 0, 50], outputRange: [1, 0, 0], extrapolate: 'clamp' });

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => isTop,
        onMoveShouldSetPanResponder: (_, g) => isTop && (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5),
        onPanResponderGrant: () => { tap.current = true; },
        onPanResponderMove: (_, g) => {
            if (Math.abs(g.dx) > 8) tap.current = false;
            position.setValue({ x: g.dx, y: g.dy * 0.3 });
            setSwipeDir(g.dx > 0 ? 'right' : 'left');
        },
        onPanResponderRelease: (_, g) => {
            if (tap.current && Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
                Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
                setSwipeDir(null);
                onCardTap();
                return;
            }
            if (g.dx > SWIPE_THRESHOLD) {
                Animated.timing(position, { toValue: { x: SCREEN_W * 1.5, y: g.dy * 0.3 }, duration: 280, useNativeDriver: true }).start(onSwipeRight);
            } else if (g.dx < -SWIPE_THRESHOLD) {
                Animated.timing(position, { toValue: { x: -SCREEN_W * 1.5, y: g.dy * 0.3 }, duration: 280, useNativeDriver: true }).start(onSwipeLeft);
            } else {
                Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
                setSwipeDir(null);
            }
        },
    })).current;

    const triggerSwipe = (dir: 'left' | 'right') => {
        const dest = dir === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;
        Animated.timing(position, { toValue: { x: dest, y: 0 }, duration: 320, useNativeDriver: true })
            .start(dir === 'right' ? onSwipeRight : onSwipeLeft);
    };

    if (!item) return null; // Safety check

    const mainImage = item.images?.[0] || 'https://via.placeholder.com/400x600?text=No+Image';

    return (
        <Animated.View
            style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
            {...panResponder.panHandlers}
        >
            {/* Full-bleed image */}
            <Image source={{ uri: mainImage }} style={{ width: '100%', height: '100%', position: 'absolute' }} resizeMode="cover" />

            {/* Subtle top-to-bottom fading scrim */}
            <View style={styles.scrimTop} />
            <View style={styles.scrimBottom} />

            {/* Swipe hint indicators (icon only, no text) */}
            <Animated.View style={[styles.swipeHint, styles.swipeHintLike, { opacity: likeOpacity }]}>
                <Ionicons name="heart" size={34} color="#fff" />
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintNope, { opacity: nopeOpacity }]}>
                <Ionicons name="close" size={34} color="#fff" />
            </Animated.View>

            {/* Owner — top left minimal pill */}
            <View style={styles.ownerChip}>
                {item.profiles?.avatar_url
                    ? <Image source={{ uri: item.profiles.avatar_url }} style={styles.ownerAvatarImg} />
                    : <View style={styles.ownerAvatarFallback}><Ionicons name="person" size={11} color="#fff" /></View>
                }
                <Text style={styles.ownerName} numberOfLines={1}>
                    {item.profiles?.full_name || item.profiles?.username || 'Unknown'}
                </Text>
            </View>

            {/* Wishlist — top right */}
            <TouchableOpacity style={styles.wishlistBtn} onPress={onWishlistToggle} activeOpacity={0.8}>
                <Ionicons name={isWishlisted ? 'heart' : 'heart-outline'} size={20}
                    color={isWishlisted ? '#E74C3C' : '#fff'} />
            </TouchableOpacity>

            {/* Bottom info + actions */}
            <View style={styles.cardBottom}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardMeta}>
                    {[item.brand, item.size, item.condition].filter(Boolean).join('  ·  ')}
                </Text>
                {item.profiles?.location ? (
                    <View style={styles.cardLocRow}>
                        <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.65)" />
                        <Text style={styles.cardLocText}>{item.profiles.location}</Text>
                    </View>
                ) : null}

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.nopeBtn]} onPress={() => triggerSwipe('left')} activeOpacity={0.85}>
                        <Ionicons name="close" size={24} color="#E74C3C" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={onCardTap} activeOpacity={0.85}>
                        <Ionicons name="chevron-up" size={20} color="rgba(255,255,255,0.85)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => triggerSwipe('right')} activeOpacity={0.85}>
                        <Ionicons name="heart" size={22} color={Colors.primary.forestGreen} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

// Helper to translate filter options
const getOptionLabel = (field: string, value: string) => {
    if (!value) return '';
    if (field === 'sort') return i18n.t(`sort_${value}`) || value;
    if (field === 'category') return i18n.t(`cat_${value}`) || value;
    if (field === 'gender') return i18n.t(`gen_${value}`) || value;
    if (field === 'condition') return i18n.t(`cond_${value.replace(/ /g, '')}`) || value;
    return value;
};

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ visible, filters, onChange, onApply, onClose }: {
    visible: boolean; filters: Filters;
    onChange: (key: keyof Filters, val: string) => void;
    onApply: () => void; onClose: () => void;
}) {
    const FilterRow = ({ label, field, options }: { label: string; field: keyof Filters; options?: string[] }) => (
        <View style={fp.filterRow}>
            <View style={fp.filterLeft}>
                <Text style={fp.filterLabel}>{label}</Text>
                <Text style={fp.filterValue}>{getOptionLabel(field, filters[field]) || 'Any'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.neutrals.gray} />
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
            <View style={fp.overlay}>
                <View style={fp.sheet}>
                    {/* Header */}
                    <View style={fp.header}>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.secondary.deepMaroon} /></TouchableOpacity>
                        <Text style={fp.title}>{i18n.t('filters')}</Text>
                        <TouchableOpacity onPress={() => { Object.keys(DEFAULT_FILTERS).forEach(k => onChange(k as keyof Filters, '')); }}>
                            <Text style={fp.resetText}>{i18n.t('reset')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Radius */}
                        <View style={fp.section}>
                            <Text style={fp.sectionLabel}>{i18n.t('searchRadius')}</Text>
                            <TextInput
                                style={fp.textInput}
                                value={filters.radius_km}
                                onChangeText={v => onChange('radius_km', v)}
                                keyboardType="numeric"
                                placeholder="e.g. 25"
                                placeholderTextColor={Colors.neutrals.gray}
                            />
                        </View>

                        {/* Dropdown filters — each shows a simple picker-style list when value empty */}
                        {[
                            { label: i18n.t('sortBy'), field: 'sort' as keyof Filters, options: SORT_OPTIONS },
                            { label: i18n.t('category'), field: 'category' as keyof Filters, options: CATEGORY_OPTIONS },
                            { label: i18n.t('gender'), field: 'gender' as keyof Filters, options: GENDER_OPTIONS },
                            { label: i18n.t('size'), field: 'size' as keyof Filters, options: SIZE_OPTIONS },
                            { label: i18n.t('condition'), field: 'condition' as keyof Filters, options: CONDITION_OPTIONS },
                        ].map(({ label, field, options }) => (
                            <View key={field}>
                                <Text style={fp.subsectionLabel}>{label}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fp.chipRow}>
                                    {options.map(opt => (
                                        <TouchableOpacity
                                            key={opt}
                                            style={[fp.chip, filters[field] === opt && fp.chipSelected]}
                                            onPress={() => onChange(field, filters[field] === opt ? '' : opt)}
                                        >
                                            <Text style={[fp.chipText, filters[field] === opt && fp.chipTextSelected]}>
                                                {getOptionLabel(field, opt)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ))}

                        {/* Free text filters */}
                        {[
                            { label: i18n.t('color'), field: 'color' as keyof Filters, placeholder: 'e.g. Black' },
                            { label: i18n.t('brand'), field: 'brand' as keyof Filters, placeholder: 'e.g. H&M' },
                        ].map(({ label, field, placeholder }) => (
                            <View key={field} style={fp.section}>
                                <Text style={fp.sectionLabel}>{label}</Text>
                                <TextInput
                                    style={fp.textInput}
                                    value={filters[field]}
                                    onChangeText={v => onChange(field, v)}
                                    placeholder={placeholder}
                                    placeholderTextColor={Colors.neutrals.gray}
                                />
                            </View>
                        ))}

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <TouchableOpacity style={fp.applyBtn} onPress={onApply}>
                        <Text style={fp.applyText}>{i18n.t('applyFilters')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// ─── Item Detail Sheet ─────────────────────────────────────────────────────────
function ItemDetailSheet({ item, visible, onClose }: { item: Item | null; visible: boolean; onClose: () => void; }) {
    if (!item) return null;
    
    // Ensure item.images is an array to prevent errors
    const images = Array.isArray(item.images) ? item.images : [];

    return (
        <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
            <View style={ds.overlay}>
                <View style={ds.sheet}>
                    <View style={ds.dragHandle} />
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Gallery */}
                        {images.length > 0 && (
                            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                                {images.map((uri, i) => (
                                    <Image key={i} source={{ uri }} style={ds.galleryImage} resizeMode="cover" />
                                ))}
                            </ScrollView>
                        )}

                        <View style={ds.content}>
                            <Text style={ds.itemTitle}>{item.title}</Text>

                            {/* Tags row */}
                            <View style={ds.tagsRow}>
                                {[item.brand, item.size, item.condition, item.color, item.category].filter(Boolean).map((tag, i) => (
                                    <View key={i} style={ds.tag}><Text style={ds.tagText}>{tag}</Text></View>
                                ))}
                            </View>

                            {/* Owner */}
                            <View style={ds.ownerRow}>
                                {item.profiles?.avatar_url
                                    ? <Image source={{ uri: item.profiles.avatar_url }} style={ds.ownerImg} />
                                    : <View style={[ds.ownerImg, ds.ownerImgPlaceholder]}><Ionicons name="person" size={18} color="#fff" /></View>
                                }
                                <View>
                                    <Text style={ds.ownerNameText}>{item.profiles?.full_name || item.profiles?.username}</Text>
                                    {item.profiles?.location ? <Text style={ds.ownerLocText}>{item.profiles.location}</Text> : null}
                                </View>
                                {item.profiles?.rating > 0 && (
                                    <View style={ds.ratingBadge}>
                                        <Ionicons name="star" size={12} color="#F4C430" />
                                        <Text style={ds.ratingText}>{item.profiles.rating.toFixed(1)}</Text>
                                    </View>
                                )}
                            </View>

                            {/* About */}
                            {item.description ? (
                                <>
                                    <Text style={ds.sectionTitle}>{i18n.t('about')}</Text>
                                    <Text style={ds.description}>{item.description}</Text>
                                </>
                            ) : null}
                        </View>
                    </ScrollView>

                    <TouchableOpacity style={ds.closeBtn} onPress={onClose}>
                        <Ionicons name="chevron-down" size={22} color={Colors.secondary.deepMaroon} />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SwapScreen() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const swipedInSession = useRef<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [filterVisible, setFilterVisible] = useState(false);
    const [detailItem, setDetailItem] = useState<Item | null>(null);
    const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);
    const [bannerMsg, setBannerMsg] = useState<string | null>(null);
    const router = useRouter();
    const [locale, setLocale] = useState(i18n.locale); // Force render on lang change

    const fetchFeed = useCallback(async (f: Filters, p: number, replace = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(p));
            params.set('page_size', '15');
            if (f.sort) params.set('sort', f.sort);
            if (f.category) params.set('category', f.category);
            if (f.gender) params.set('gender', f.gender);
            if (f.size) params.set('size', f.size);
            if (f.color) params.set('color', f.color);
            if (f.brand) params.set('brand', f.brand);
            if (f.condition) params.set('condition', f.condition);
            if (f.radius_km) params.set('radius_km', f.radius_km);

            const data = await authenticatedFetch(`/items/feed?${params.toString()}`);
            const fetched: Item[] = data.items || [];
            // Filter out any items already swiped in this session (client-side guard)
            const unseen = fetched.filter(it => !swipedInSession.current.has(it.id));
            setItems(prev => replace ? unseen : [...prev, ...unseen]);
            setHasMore(data.has_more);
            setPage(p);
        } catch (e: any) {
            setBannerMsg(friendlyError(e.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        setLocale(i18n.locale); // Ensure we re-render with new language
        fetchFeed(filters, 1, true);
    }, []));

    const handleSwipe = async (item: Item, direction: 'left' | 'right') => {
        // Track as swiped so it never reappears in this session
        swipedInSession.current.add(item.id);
        // Remove from local stack immediately
        setItems(prev => prev.filter(i => i.id !== item.id));

        // Load more if running low
        if (items.length <= 3 && hasMore) {
            fetchFeed(filters, page + 1);
        }

        try {
            const result = await authenticatedFetch('/swipes', {
                method: 'POST',
                body: JSON.stringify({ item_id: item.id, direction }),
            });
            console.log('Swipe result:', JSON.stringify(result));
            if (result?.warning) console.warn('Swipe warning:', result.warning, result.detail ?? '');
            // Right swipe → show a popup instead of force-navigating
            if (direction === 'right') {
                console.log('Right swipe — matched:', result?.matched, 'conv_id:', result?.conversation_id);
                if (result?.conversation_id) {
                    Alert.alert(
                        i18n.t('matchTitle'),
                        i18n.t('matchMsg'),
                        [{ text: i18n.t('keepSwiping'), style: 'default' }]
                    );
                } else {
                    console.warn('Right swipe but no conversation_id returned:', JSON.stringify(result));
                }
            }
        } catch (e: any) {
            setBannerMsg(friendlyError(e.message));
        }
    };

    const toggleWishlist = async (item: Item) => {
        const alreadySaved = wishlisted.has(item.id);
        // Optimistic update
        setWishlisted(prev => {
            const next = new Set(prev);
            alreadySaved ? next.delete(item.id) : next.add(item.id);
            return next;
        });
        try {
            if (alreadySaved) {
                await authenticatedFetch(`/wishlists/${item.id}`, { method: 'DELETE' });
            } else {
                await authenticatedFetch('/wishlists', {
                    method: 'POST',
                    body: JSON.stringify({ item_id: item.id }),
                });
            }
        } catch (e: any) {
            // Rollback on error
            setWishlisted(prev => {
                const next = new Set(prev);
                alreadySaved ? next.add(item.id) : next.delete(item.id);
                return next;
            });
        }
    };

    const applyFilters = () => {
        const count = Object.entries(pendingFilters).filter(([k, v]) => v && v !== 'newest').length;
        setActiveFiltersCount(count);
        setFilters({ ...pendingFilters });
        setFilterVisible(false);
        fetchFeed(pendingFilters, 1, true);
    };

    const topItem = items[0] || null;
    const secondItem = items[1] || null;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* Status banner */}
            <StatusBanner message={bannerMsg} onDismiss={() => setBannerMsg(null)} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>SwapStyl</Text>
                <TouchableOpacity style={styles.filterIconBtn} onPress={() => { setPendingFilters(filters); setFilterVisible(true); }}>
                    <Ionicons name="options-outline" size={24} color={Colors.secondary.deepMaroon} />
                    {activeFiltersCount > 0 && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Card stack */}
            <View style={styles.cardArea}>
                {loading && items.length === 0 ? (
                    <View style={styles.centerMsg}><ActivityIndicator size="large" color={Colors.primary.forestGreen} /></View>
                ) : items.length === 0 ? (
                    <View style={styles.centerMsg}>
                        <Ionicons name="shirt-outline" size={64} color={Colors.neutrals.gray} />
                        <Text style={styles.emptyTitle}>{i18n.t('noItems')}</Text>
                        <Text style={styles.emptySubtitle}>{i18n.t('noItemsDesc')}</Text>
                        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchFeed(filters, 1, true)}>
                            <Text style={styles.refreshBtnText}>{i18n.t('refresh')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {topItem && (
                            <SwipeCard
                                key={topItem.id}
                                item={topItem}
                                isTop
                                isWishlisted={wishlisted.has(topItem.id)}
                                onSwipeLeft={() => handleSwipe(topItem, 'left')}
                                onSwipeRight={() => handleSwipe(topItem, 'right')}
                                onWishlistToggle={() => toggleWishlist(topItem)}
                                onCardTap={() => setDetailItem(topItem)}
                            />
                        )}
                    </>
                )}
            </View>

            {/* Panels */}
            <FilterPanel
                visible={filterVisible}
                filters={pendingFilters}
                onChange={(k, v) => setPendingFilters(prev => ({ ...prev, [k]: v }))}
                onApply={applyFilters}
                onClose={() => setFilterVisible(false)}
            />
            <ItemDetailSheet item={detailItem} visible={!!detailItem} onClose={() => setDetailItem(null)} />
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10,
    },
    logo: { fontSize: 22, fontWeight: '800', color: Colors.primary.forestGreen, letterSpacing: -0.5 },
    filterIconBtn: { padding: 6, position: 'relative' },
    filterBadge: {
        position: 'absolute', top: 2, right: 2,
        backgroundColor: Colors.secondary.deepMaroon, borderRadius: 8,
        width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    },
    filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    centerMsg: { alignItems: 'center', gap: 14, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.secondary.deepMaroon },
    emptySubtitle: { fontSize: 14, color: Colors.neutrals.gray, textAlign: 'center', lineHeight: 22 },
    refreshBtn: {
        marginTop: 8, backgroundColor: Colors.primary.forestGreen,
        paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
    },
    refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Card
    card: {
        position: 'absolute',
        width: CARD_W,
        height: CARD_H,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#111',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 16,
    },

    // Scrims
    scrimTop: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 100,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    scrimBottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 260,
        backgroundColor: 'rgba(0,0,0,0.72)',
    },

    // Owner chip
    ownerChip: {
        position: 'absolute', top: 16, left: 16,
        flexDirection: 'row', alignItems: 'center', gap: 7,
        backgroundColor: 'rgba(0,0,0,0.38)',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
    },
    ownerAvatarImg: { width: 24, height: 24, borderRadius: 12 },
    ownerAvatarFallback: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: Colors.primary.forestGreen,
        alignItems: 'center', justifyContent: 'center',
    },
    ownerName: { color: '#fff', fontWeight: '600', fontSize: 12, maxWidth: 120 },

    // Wishlist btn
    wishlistBtn: {
        position: 'absolute', top: 16, right: 16,
        backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 20,
        width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
    },

    // Swipe hint icons
    swipeHint: {
        position: 'absolute', top: '38%',
        width: 64, height: 64, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
    },
    swipeHintLike: { left: 24, backgroundColor: Colors.primary.forestGreen },
    swipeHintNope: { right: 24, backgroundColor: '#E74C3C' },

    // Bottom info
    cardBottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingBottom: 20, paddingTop: 16,
    },
    cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
    cardMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', marginBottom: 4 },
    cardLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 18 },
    cardLocText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

    // Action row
    actionRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    },
    actionBtn: {
        width: 54, height: 54, borderRadius: 27,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
    },
    nopeBtn: { backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#E74C3C' },
    infoBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    likeBtn: { backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: Colors.primary.forestGreen },
});

// Filter panel styles
const fp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, maxHeight: SCREEN_H * 0.88 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 17, fontWeight: '700', color: Colors.secondary.deepMaroon },
    resetText: { fontSize: 14, color: Colors.primary.forestGreen, fontWeight: '600' },
    section: { marginBottom: 16 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondary.deepMaroon, marginBottom: 8 },
    subsectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondary.deepMaroon, marginBottom: 8, marginTop: 8 },
    textInput: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 10, height: 44, paddingHorizontal: 14, fontSize: 15, color: Colors.secondary.deepMaroon, backgroundColor: '#FAFAFA' },
    filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    filterLeft: { gap: 2 },
    filterLabel: { fontSize: 15, fontWeight: '600', color: Colors.secondary.deepMaroon },
    filterValue: { fontSize: 13, color: Colors.neutrals.gray },
    chipRow: { gap: 8, paddingBottom: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
    chipSelected: { backgroundColor: Colors.primary.forestGreen, borderColor: Colors.primary.forestGreen },
    chipText: { fontSize: 13, color: Colors.secondary.deepMaroon, fontWeight: '500' },
    chipTextSelected: { color: '#fff', fontWeight: '700' },
    applyBtn: { backgroundColor: Colors.secondary.deepMaroon, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 16 },
    applyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

// Detail sheet styles
const ds = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_H * 0.9 },
    dragHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
    galleryImage: { width: SCREEN_W, height: 280, resizeMode: 'cover' },
    content: { padding: 20 },
    itemTitle: { fontSize: 22, fontWeight: '800', color: Colors.secondary.deepMaroon, marginBottom: 10 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    tag: { backgroundColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
    tagText: { fontSize: 13, color: Colors.secondary.deepMaroon, fontWeight: '500' },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    ownerImg: { width: 42, height: 42, borderRadius: 21 },
    ownerImgPlaceholder: { backgroundColor: Colors.primary.forestGreen, alignItems: 'center', justifyContent: 'center' },
    ownerNameText: { fontWeight: '700', fontSize: 14, color: Colors.secondary.deepMaroon },
    ownerLocText: { fontSize: 12, color: Colors.neutrals.gray },
    ratingBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF8E7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    ratingText: { fontSize: 12, fontWeight: '700', color: '#B8860B' },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.secondary.deepMaroon, marginBottom: 8 },
    description: { fontSize: 14, lineHeight: 22, color: '#666' },
    closeBtn: { position: 'absolute', top: 14, right: 16, backgroundColor: '#F0F0F0', borderRadius: 16, padding: 6 },
});
