import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Alert, ActivityIndicator, Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authenticatedFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ItemDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [activePhoto, setActivePhoto] = useState(0);

    useEffect(() => {
        loadItem();
    }, [id]);

    async function loadItem() {
        try {
            const [itemData, { data: { user } }] = await Promise.all([
                authenticatedFetch(`/items/${id}`),
                supabase.auth.getUser(),
            ]);
            setItem(itemData);
            setIsOwner(user?.id === itemData?.owner_id);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleReVerify() {
        setVerifying(true);
        try {
            const result = await authenticatedFetch(`/items/${id}/re-verify`, { method: 'POST' });
            if (result.verified) {
                Alert.alert('✅ Approved!', `AI Confidence: ${result.ai_score}%\n\nYour item is now live in the swap feed.`);
            } else {
                Alert.alert('⏳ Still under review', `AI Confidence: ${result.ai_score}%\n${result.reason || ''}\n\nYou can also publish it manually.`);
            }
            // Reload item to get updated status
            await loadItem();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setVerifying(false);
        }
    }

    async function handleManualPublish() {
        Alert.alert(
            'Publish Item',
            'Are you sure you want to manually publish this item to the swap feed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Publish', onPress: async () => {
                        try {
                            await authenticatedFetch(`/items/${id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'available' }),
                            });
                            Alert.alert('✅ Published!', 'Your item is now live.');
                            await loadItem();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    }

    async function handleDelete() {
        Alert.alert(
            'Delete Item',
            'This will permanently remove the item. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            await authenticatedFetch(`/items/${id}`, { method: 'DELETE' });
                            router.back();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}><ActivityIndicator size="large" color={Colors.primary.forestGreen} /></View>
            </SafeAreaView>
        );
    }

    if (!item) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}><Text>Item not found.</Text></View>
            </SafeAreaView>
        );
    }

    const images: string[] = item.images || [];
    const tags = [item.brand, item.size, item.condition, item.color, item.category, item.gender].filter(Boolean);
    const isPending = item.status === 'pending_review';

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <Text style={s.headerTitle} numberOfLines={1}>{item.title}</Text>
                {isOwner && (
                    <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
                        <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photo gallery */}
                <View style={s.galleryWrapper}>
                    <ScrollView
                        horizontal pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={e => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
                    >
                        {images.length > 0 ? images.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={s.galleryImage} resizeMode="cover" />
                        )) : (
                            <View style={[s.galleryImage, s.noImage]}>
                                <Ionicons name="shirt-outline" size={64} color="#DDD" />
                            </View>
                        )}
                    </ScrollView>
                    {/* Dot indicators */}
                    {images.length > 1 && (
                        <View style={s.dotsRow}>
                            {images.map((_, i) => (
                                <View key={i} style={[s.dot, i === activePhoto && s.dotActive]} />
                            ))}
                        </View>
                    )}
                    {/* Status badge */}
                    {isPending && (
                        <View style={s.pendingBanner}>
                            <Ionicons name="time-outline" size={14} color="#fff" />
                            <Text style={s.pendingBannerText}>Under Review</Text>
                        </View>
                    )}
                    {item.status === 'available' && (
                        <View style={[s.pendingBanner, s.availableBanner]}>
                            <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                            <Text style={s.pendingBannerText}>Live</Text>
                        </View>
                    )}
                </View>

                <View style={s.content}>
                    {/* Title + owner */}
                    <Text style={s.itemTitle}>{item.title}</Text>

                    {/* Owner row (only if not own item) */}
                    {!isOwner && item.profiles && (
                        <View style={s.ownerRow}>
                            {item.profiles.avatar_url
                                ? <Image source={{ uri: item.profiles.avatar_url }} style={s.ownerAvatar} />
                                : <View style={[s.ownerAvatar, s.ownerAvatarPlaceholder]}><Ionicons name="person" size={16} color="#fff" /></View>
                            }
                            <View>
                                <Text style={s.ownerName}>{item.profiles.full_name || item.profiles.username}</Text>
                                {item.profiles.location ? <Text style={s.ownerLoc}>{item.profiles.location}</Text> : null}
                            </View>
                            {item.profiles.rating > 0 && (
                                <View style={s.ratingBadge}>
                                    <Ionicons name="star" size={11} color="#F4C430" />
                                    <Text style={s.ratingText}>{Number(item.profiles.rating).toFixed(1)}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Tags */}
                    <View style={s.tagsRow}>
                        {tags.map((t, i) => <View key={i} style={s.tag}><Text style={s.tagText}>{t}</Text></View>)}
                    </View>

                    {/* Description */}
                    {item.description ? (
                        <>
                            <Text style={s.sectionTitle}>About this item</Text>
                            <Text style={s.description}>{item.description}</Text>
                        </>
                    ) : null}

                    {/* Owner actions for pending_review */}
                    {isOwner && isPending && (
                        <View style={s.ownerActions}>
                            <Text style={s.ownerActionsTitle}>⏳ This item is under review</Text>
                            <Text style={s.ownerActionsSubtitle}>
                                AI confidence was below 85%. You can re-run AI verification or publish manually.
                            </Text>
                            <TouchableOpacity
                                style={[s.actionBtn, s.reverifyBtn]}
                                onPress={handleReVerify}
                                disabled={verifying}
                            >
                                {verifying
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <>
                                        <Ionicons name="refresh-outline" size={18} color="#fff" />
                                        <Text style={s.actionBtnText}>Re-verify with AI</Text>
                                    </>
                                }
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.actionBtn, s.publishBtn]} onPress={handleManualPublish}>
                                <Ionicons name="rocket-outline" size={18} color="#fff" />
                                <Text style={s.actionBtnText}>Publish Manually</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isOwner && item.status === 'available' && (
                        <View style={[s.ownerActions, { backgroundColor: '#EEF8F0' }]}>
                            <Text style={[s.ownerActionsTitle, { color: Colors.primary.forestGreen }]}>✅ Item is live</Text>
                            <Text style={s.ownerActionsSubtitle}>It's visible in the swap feed for other users.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    },
    backBtn: { padding: 4 },
    deleteBtn: { padding: 4, marginLeft: 'auto' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.secondary.deepMaroon },

    // Gallery
    galleryWrapper: { position: 'relative' },
    galleryImage: { width: SCREEN_W, height: SCREEN_W * 1.1, backgroundColor: '#EEE' },
    noImage: { alignItems: 'center', justifyContent: 'center' },
    dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: '#fff', width: 18 },
    pendingBanner: {
        position: 'absolute', top: 12, left: 12,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(180,120,0,0.85)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    availableBanner: { backgroundColor: 'rgba(39,120,70,0.85)' },
    pendingBannerText: { color: '#fff', fontWeight: '700', fontSize: 12 },

    // Content
    content: { padding: 20 },
    itemTitle: { fontSize: 24, fontWeight: '800', color: Colors.secondary.deepMaroon, marginBottom: 12 },

    // Owner
    ownerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginBottom: 16, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
    },
    ownerAvatar: { width: 40, height: 40, borderRadius: 20 },
    ownerAvatarPlaceholder: { backgroundColor: Colors.primary.forestGreen, alignItems: 'center', justifyContent: 'center' },
    ownerName: { fontWeight: '700', fontSize: 14, color: Colors.secondary.deepMaroon },
    ownerLoc: { fontSize: 12, color: '#888' },
    ratingBadge: {
        marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#FFF8E7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    },
    ratingText: { fontSize: 12, fontWeight: '700', color: '#B8860B' },

    // Tags
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    tag: { backgroundColor: '#EEEAE4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
    tagText: { fontSize: 13, color: Colors.secondary.deepMaroon, fontWeight: '500' },

    // Description
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.secondary.deepMaroon, marginBottom: 8 },
    description: { fontSize: 14, lineHeight: 22, color: '#555' },

    // Owner actions
    ownerActions: {
        marginTop: 20, backgroundColor: '#FFF8EE', borderRadius: 14,
        padding: 16, gap: 10,
    },
    ownerActionsTitle: { fontSize: 15, fontWeight: '700', color: '#8B6000' },
    ownerActionsSubtitle: { fontSize: 13, color: '#888', lineHeight: 18 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 13, borderRadius: 12,
    },
    reverifyBtn: { backgroundColor: Colors.secondary.deepMaroon },
    publishBtn: { backgroundColor: Colors.primary.forestGreen },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
