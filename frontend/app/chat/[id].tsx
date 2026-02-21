import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    Image, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, Modal, ScrollView, Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { authenticatedFetch } from '../../lib/api';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Deal progress ─────────────────────────────────────────────────────────────
const DEAL_STEPS = [
    { key: 'interested', icon: 'hand-right-outline', label: 'Interested' },
    { key: 'negotiating', icon: 'chatbubbles-outline', label: 'Talking' },
    { key: 'deal_agreed', icon: 'checkmark-circle-outline', label: 'Agreed' },
    { key: 'completed', icon: 'ribbon-outline', label: 'Swapped!' },
];
const STEP_INDEX: Record<string, number> = {
    interested: 0, negotiating: 1, deal_agreed: 2, completed: 3, cancelled: -1,
};

function DealProgressBar({ status }: { status: string }) {
    const idx = STEP_INDEX[status] ?? 0;
    const cancelled = status === 'cancelled';
    return (
        <View style={pb.wrap}>
            {DEAL_STEPS.map((step, i) => {
                const done = i <= idx && !cancelled;
                const active = i === idx && !cancelled;
                return (
                    <View key={step.key} style={pb.step}>
                        <View style={[pb.dot, done && pb.dotDone, active && pb.dotActive]}>
                            <Ionicons name={step.icon as any} size={13} color={done ? '#fff' : '#BBB'} />
                        </View>
                        <Text style={[pb.label, done && pb.labelDone]}>{step.label}</Text>
                        {i < DEAL_STEPS.length - 1 && (
                            <View style={[pb.line, done && i < idx && pb.lineDone]} />
                        )}
                    </View>
                );
            })}
        </View>
    );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }: { msg: any; isMe: boolean }) {
    if (msg.type === 'system') {
        return (
            <View style={b.systemWrap}>
                <Text style={b.systemText}>{msg.content}</Text>
            </View>
        );
    }
    if (msg.type === 'item_proposal' && msg.metadata) {
        const m = msg.metadata;
        return (
            <View style={[b.wrap, isMe ? b.wrapMe : b.wrapThem]}>
                <View style={[b.proposalCard, isMe ? b.proposalCardMe : b.proposalCardThem]}>
                    {m.item_image && (
                        <Image source={{ uri: m.item_image }} style={b.proposalImg} resizeMode="cover" />
                    )}
                    <View style={b.proposalInfo}>
                        <Text style={b.proposalLabel}>👕 Item proposal</Text>
                        <Text style={b.proposalTitle} numberOfLines={1}>{m.item_title}</Text>
                        <Text style={b.proposalMeta}>{[m.item_brand, m.item_size, m.item_condition].filter(Boolean).join(' · ')}</Text>
                        <Text style={b.proposalSub}>{msg.content}</Text>
                    </View>
                </View>
                <Text style={[b.time, isMe ? b.timeMe : b.timeThem]}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && msg.read_at ? '  ✓✓' : isMe ? '  ✓' : ''}
                </Text>
            </View>
        );
    }

    return (
        <View style={[b.wrap, isMe ? b.wrapMe : b.wrapThem]}>
            <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleThem]}>
                <Text style={[b.text, isMe ? b.textMe : b.textThem]}>
                    {msg.is_deleted ? <Text style={b.deleted}>Message removed</Text> : msg.content}
                </Text>
            </View>
            <Text style={[b.time, isMe ? b.timeMe : b.timeThem]}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {isMe && msg.read_at ? '  ✓✓' : isMe ? '  ✓' : ''}
            </Text>
        </View>
    );
}

// ── Wardrobe bottom sheet ─────────────────────────────────────────────────────
function WardrobeSheet({
    visible, onClose, convId, myId, otherId, onSelectItem,
}: {
    visible: boolean; onClose: () => void;
    convId: string; myId: string; otherId: string;
    onSelectItem: (item: any, isOwn: boolean) => void;
}) {
    const [tab, setTab] = useState<'mine' | 'theirs'>('mine');
    const [myItems, setMyItems] = useState<any[]>([]);
    const [theirItems, setTheirItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) fetchWardrobe();
    }, [visible, tab]);

    async function fetchWardrobe() {
        setLoading(true);
        try {
            const uid = tab === 'mine' ? myId : otherId;
            const data = await authenticatedFetch(`/conversations/${convId}/wardrobe/${uid}`);
            if (tab === 'mine') setMyItems(data || []);
            else setTheirItems(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const items = tab === 'mine' ? myItems : theirItems;

    return (
        <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
            <Pressable style={ws.overlay} onPress={onClose}>
                <Pressable style={ws.sheet} onPress={e => e.stopPropagation()}>
                    <View style={ws.handle} />
                    <View style={ws.header}>
                        <Text style={ws.title}>Browse Wardrobe</Text>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.secondary.deepMaroon} /></TouchableOpacity>
                    </View>
                    <View style={ws.tabs}>
                        <TouchableOpacity style={[ws.tab, tab === 'mine' && ws.tabActive]} onPress={() => setTab('mine')}>
                            <Text style={[ws.tabText, tab === 'mine' && ws.tabTextActive]}>My Items</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[ws.tab, tab === 'theirs' && ws.tabActive]} onPress={() => setTab('theirs')}>
                            <Text style={[ws.tabText, tab === 'theirs' && ws.tabTextActive]}>Their Items</Text>
                        </TouchableOpacity>
                    </View>
                    {loading ? <ActivityIndicator style={{ marginTop: 32 }} color={Colors.primary.forestGreen} /> : (
                        <ScrollView contentContainerStyle={ws.grid}>
                            {items.length === 0 && (
                                <Text style={ws.empty}>No available items.</Text>
                            )}
                            {items.map((item: any) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={ws.card}
                                    onPress={() => { onSelectItem(item, tab === 'mine'); onClose(); }}
                                >
                                    {item.images?.[0]
                                        ? <Image source={{ uri: item.images[0] }} style={ws.cardImg} resizeMode="cover" />
                                        : <View style={[ws.cardImg, ws.cardImgFallback]}><Ionicons name="shirt-outline" size={20} color="#BBB" /></View>
                                    }
                                    <Text style={ws.cardTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={ws.cardMeta}>{[item.brand, item.size].filter(Boolean).join(' · ')}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ── Main Chat Room ─────────────────────────────────────────────────────────────
export default function ChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [conv, setConv] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [wardrobeOpen, setWardrobeOpen] = useState(false);
    const [myId, setMyId] = useState<string>('');
    const [actionLoading, setActionLoading] = useState(false);

    const flatRef = useRef<FlatList>(null);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        init();
        return () => { channelRef.current?.unsubscribe(); };
    }, [id]);

    async function init() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setMyId(user.id);
        await Promise.all([loadConv(user.id), loadMessages()]);
        subscribeRealtime(user.id);
        setLoading(false);
    }

    async function loadConv(uid: string) {
        try {
            const data = await authenticatedFetch(`/conversations/${id}`);
            setConv(data);
        } catch (e) { console.error(e); }
    }

    async function loadMessages() {
        try {
            const data = await authenticatedFetch(`/conversations/${id}/messages?page_size=60`);
            setMessages(data.messages || []);
        } catch (e) { console.error(e); }
    }

    function subscribeRealtime(uid: string) {
        const channel = supabase
            .channel(`chat:${id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages',
                filter: `conversation_id=eq.${id}`,
            }, (payload: any) => {
                setMessages(prev => [...prev, payload.new]);
                setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'conversations',
                filter: `id=eq.${id}`,
            }, (payload: any) => {
                setConv((prev: any) => ({ ...prev, ...payload.new }));
            })
            .subscribe();
        channelRef.current = channel;
    }

    async function sendMessage(content = text.trim(), type = 'text', metadata?: any) {
        if (!content) return;
        setSending(true);
        setText('');
        try {
            const body: any = { content, type };
            if (metadata) body.metadata = metadata;
            await authenticatedFetch(`/conversations/${id}/messages`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSending(false);
        }
    }

    async function handleDealAction(action: 'agree' | 'complete' | 'cancel') {
        setActionLoading(true);
        try {
            const data = await authenticatedFetch(`/conversations/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ action }),
            });
            setConv((prev: any) => ({ ...prev, ...data }));
            await loadMessages();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setActionLoading(false);
        }
    }

    function handleItemProposal(item: any, isOwn: boolean) {
        const message = isOwn
            ? `I'd like to offer my "${item.title}" for this swap!`
            : `I'm interested in your "${item.title}" — let's discuss?`;
        sendMessage(message, 'item_proposal', {
            item_id: item.id,
            item_title: item.title,
            item_image: item.images?.[0] || null,
            item_brand: item.brand,
            item_size: item.size,
            item_condition: item.condition,
        });
    }

    // ── Deal action button ──────────────────────────────────────────────────
    function DealActionButton() {
        const status = conv?.status;
        const agreedBy: string[] = conv?.deal_agreed_by || [];
        const completedBy: string[] = conv?.completed_by || [];
        const myAgreed = agreedBy.includes(myId);
        const myCompleted = completedBy.includes(myId);

        if (status === 'completed') {
            return (
                <View style={[da.btn, da.completedBtn]}>
                    <Ionicons name="ribbon" size={16} color="#fff" />
                    <Text style={da.btnText}>Swap Complete 🎉</Text>
                </View>
            );
        }
        if (status === 'cancelled') {
            return <View style={[da.btn, da.cancelledBtn]}><Text style={da.btnText}>❌ Cancelled</Text></View>;
        }
        if (status === 'deal_agreed' && !myCompleted) {
            return (
                <TouchableOpacity
                    style={[da.btn, da.completeBtn]}
                    onPress={() => Alert.alert('Confirm Swap', 'Confirm you have completed the physical exchange?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: "Yes, it's done!", onPress: () => handleDealAction('complete') },
                    ])}
                    disabled={actionLoading}
                >
                    {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <>
                        <Ionicons name="checkmark-done" size={16} color="#fff" />
                        <Text style={da.btnText}>Mark as Swapped</Text>
                    </>}
                </TouchableOpacity>
            );
        }
        if (status === 'deal_agreed' && myCompleted) {
            return <View style={[da.btn, da.waitingBtn]}><Text style={da.btnText}>Waiting for them to confirm…</Text></View>;
        }
        if (!myAgreed) {
            return (
                <TouchableOpacity
                    style={[da.btn, da.agreeBtn]}
                    onPress={() => handleDealAction('agree')}
                    disabled={actionLoading}
                >
                    {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <>
                        <Ionicons name="checkmark-outline" size={16} color="#fff" />
                        <Text style={da.btnText}>Agree to Deal</Text>
                    </>}
                </TouchableOpacity>
            );
        }
        return <View style={[da.btn, da.waitingBtn]}><Text style={da.btnText}>Waiting for them to agree…</Text></View>;
    }

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}><ActivityIndicator color={Colors.primary.forestGreen} size="large" /></View>
            </SafeAreaView>
        );
    }

    const item = conv?.item;
    const other = conv?.other_user;
    const status = conv?.status || 'interested';

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>

                {/* ── Header ── */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                    </TouchableOpacity>
                    <View style={s.headerInfo}>
                        {other?.avatar_url
                            ? <Image source={{ uri: other.avatar_url }} style={s.headerAvatar} />
                            : <View style={[s.headerAvatar, s.headerAvatarFallback]}>
                                <Text style={s.headerAvatarInitial}>{(other?.full_name || '?')[0].toUpperCase()}</Text>
                            </View>
                        }
                        <View>
                            <Text style={s.headerName}>{other?.full_name || other?.username}</Text>
                            {item?.title && <Text style={s.headerItem} numberOfLines={1}>re: {item.title}</Text>}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={s.cancelBtn}
                        onPress={() => Alert.alert('Cancel deal?', 'This cannot be undone.', [
                            { text: 'Keep', style: 'cancel' },
                            { text: 'Cancel deal', style: 'destructive', onPress: () => handleDealAction('cancel') },
                        ])}
                    >
                        <Ionicons name="close-circle-outline" size={22} color="#E74C3C" />
                    </TouchableOpacity>
                </View>

                {/* ── Deal progress bar ── */}
                <View style={s.dealBar}>
                    {item && (
                        <TouchableOpacity style={s.itemPill} onPress={() => router.push(`/item/${item.id}`)}>
                            {item.images?.[0] && <Image source={{ uri: item.images[0] }} style={s.itemPillImg} />}
                            <Text style={s.itemPillText} numberOfLines={1}>{item.title}</Text>
                            <Ionicons name="chevron-forward" size={12} color="#888" />
                        </TouchableOpacity>
                    )}
                    <DealProgressBar status={status} />
                    <DealActionButton />
                </View>

                {/* ── Messages ── */}
                <FlatList
                    ref={flatRef}
                    data={messages}
                    keyExtractor={m => m.id}
                    renderItem={({ item: msg }) => (
                        <MessageBubble msg={msg} isMe={msg.sender_id === myId} />
                    )}
                    contentContainerStyle={s.messageList}
                    onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
                />

                {/* ── Input row ── */}
                <View style={s.inputBar}>
                    <TouchableOpacity style={s.wardrobeBtn} onPress={() => setWardrobeOpen(true)}>
                        <Ionicons name="shirt-outline" size={22} color={Colors.secondary.deepMaroon} />
                    </TouchableOpacity>
                    <TextInput
                        style={s.input}
                        value={text}
                        onChangeText={setText}
                        placeholder="Message…"
                        placeholderTextColor="#BBB"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!text.trim() || sending}
                    >
                        {sending
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Ionicons name="send" size={18} color="#fff" />
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* ── Wardrobe sheet ── */}
            <WardrobeSheet
                visible={wardrobeOpen}
                onClose={() => setWardrobeOpen(false)}
                convId={id as string}
                myId={myId}
                otherId={other?.id || ''}
                onSelectItem={handleItemProposal}
            />
        </SafeAreaView>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#EDEDEA',
        gap: 8,
    },
    backBtn: { padding: 4 },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatar: { width: 38, height: 38, borderRadius: 19 },
    headerAvatarFallback: { backgroundColor: Colors.secondary.deepMaroon, alignItems: 'center', justifyContent: 'center' },
    headerAvatarInitial: { color: '#fff', fontWeight: '700', fontSize: 14 },
    headerName: { fontWeight: '700', fontSize: 15, color: Colors.secondary.deepMaroon },
    headerItem: { fontSize: 11, color: '#888', maxWidth: SCREEN_W - 160 },
    cancelBtn: { padding: 4 },

    dealBar: {
        backgroundColor: '#fff', paddingHorizontal: 16,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDEDEA', gap: 8,
    },
    itemPill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F0EDE8', borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
    },
    itemPillImg: { width: 24, height: 24, borderRadius: 5 },
    itemPillText: { fontSize: 12, fontWeight: '600', color: Colors.secondary.deepMaroon, maxWidth: SCREEN_W - 140 },

    messageList: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EDEDEA', gap: 8,
    },
    wardrobeBtn: { padding: 8 },
    input: {
        flex: 1, backgroundColor: '#F5F3EF', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 15, color: Colors.secondary.deepMaroon, maxHeight: 100,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.primary.forestGreen,
        alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#C8DFCC' },
});

// Deal progress bar styles
const pb = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    step: { flex: 1, alignItems: 'center', position: 'relative' },
    dot: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center',
    },
    dotDone: { backgroundColor: Colors.primary.forestGreen },
    dotActive: { backgroundColor: Colors.secondary.deepMaroon },
    label: { fontSize: 9, color: '#BBB', marginTop: 3, textAlign: 'center' },
    labelDone: { color: Colors.primary.forestGreen, fontWeight: '600' },
    line: {
        position: 'absolute', top: 15, left: '60%', right: '-60%',
        height: 2, backgroundColor: '#E0E0E0', zIndex: -1,
    },
    lineDone: { backgroundColor: Colors.primary.forestGreen },
});

// Message bubble styles
const b = StyleSheet.create({
    wrap: { flexDirection: 'column', marginVertical: 3, maxWidth: '78%' },
    wrapMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    wrapThem: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
    bubbleMe: { backgroundColor: Colors.secondary.deepMaroon, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EDEDEA' },
    text: { fontSize: 15, lineHeight: 21 },
    textMe: { color: '#fff' },
    textThem: { color: Colors.secondary.deepMaroon },
    deleted: { fontStyle: 'italic', color: '#AAA' },
    time: { fontSize: 10, color: '#AAA', marginTop: 3 },
    timeMe: { alignSelf: 'flex-end' },
    timeThem: { alignSelf: 'flex-start' },
    systemWrap: { alignSelf: 'center', marginVertical: 6, maxWidth: '80%' },
    systemText: {
        fontSize: 12, color: '#888', fontStyle: 'italic',
        textAlign: 'center', lineHeight: 18,
    },
    proposalCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
    proposalCardMe: { backgroundColor: Colors.secondary.deepMaroon + '15', borderColor: Colors.secondary.deepMaroon + '40' },
    proposalCardThem: { backgroundColor: '#fff', borderColor: '#EDEDEA' },
    proposalImg: { width: '100%', height: 110 },
    proposalInfo: { padding: 10, gap: 2 },
    proposalLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
    proposalTitle: { fontSize: 14, fontWeight: '700', color: Colors.secondary.deepMaroon },
    proposalMeta: { fontSize: 11, color: '#888' },
    proposalSub: { fontSize: 12, color: Colors.secondary.deepMaroon, marginTop: 4, fontStyle: 'italic' },
});

// Deal action button styles
const da = StyleSheet.create({
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 12,
    },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    agreeBtn: { backgroundColor: Colors.secondary.deepMaroon },
    completeBtn: { backgroundColor: Colors.primary.forestGreen },
    completedBtn: { backgroundColor: Colors.primary.forestGreen },
    waitingBtn: { backgroundColor: '#CCC' },
    cancelledBtn: { backgroundColor: '#DDD' },
});

// Wardrobe sheet styles
const ws = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '80%' },
    handle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
    title: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.secondary.deepMaroon },
    tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: '#F0EDE8', borderRadius: 10, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    tabActive: { backgroundColor: '#fff' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#999' },
    tabTextActive: { color: Colors.secondary.deepMaroon },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
    empty: { color: '#BBB', textAlign: 'center', width: '100%', marginTop: 32 },
    card: { width: '30%', gap: 4 },
    cardImg: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#EEE' },
    cardImgFallback: { alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 11, fontWeight: '600', color: Colors.secondary.deepMaroon },
    cardMeta: { fontSize: 10, color: '#888' },
});
