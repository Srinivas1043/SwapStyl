import { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { authenticatedFetch } from '../lib/api';

type Step = 'start' | 'success' | 'unconfirmed';

export default function VerifyAccountScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('start');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function handleVerify() {
        setLoading(true);
        try {
            const res = await authenticatedFetch('/auth/verify/request', { method: 'POST' });

            if (res?.auto_verified) {
                setStep('success');
            } else {
                setMessage(res?.message || 'Could not verify. Please try again.');
                setStep('unconfirmed');
            }
        } catch (e: any) {
            setMessage(e?.message || 'Something went wrong. Please try again.');
            setStep('unconfirmed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Get Verified</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

                {step === 'start' && (
                    <View style={s.content}>
                        {/* Badge preview */}
                        <View style={s.card}>
                            <View style={s.badgeCircle}>
                                <Ionicons name="checkmark" size={36} color="#fff" />
                            </View>
                            <Text style={s.cardTitle}>Verified Badge</Text>
                            <Text style={s.cardSubtitle}>
                                Get a blue ✓ badge that appears on your profile, in chats, and next to your name everywhere in the app.
                            </Text>
                        </View>

                        {/* How it works */}
                        <View style={s.howBox}>
                            <Text style={s.howTitle}>How it works</Text>
                            {[
                                { icon: 'mail-outline', text: 'We check if your account email is confirmed' },
                                { icon: 'shield-checkmark-outline', text: 'If confirmed, your badge is activated instantly' },
                                { icon: 'person-outline', text: 'Badge appears on your profile immediately' },
                            ].map((item, i) => (
                                <View key={i} style={s.howRow}>
                                    <Ionicons name={item.icon as any} size={20} color={Colors.primary.forestGreen} />
                                    <Text style={s.howText}>{item.text}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[s.btn, loading && s.btnDisabled]}
                            onPress={handleVerify}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                                    <Text style={s.btnText}>Verify My Account</Text>
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'success' && (
                    <View style={s.content}>
                        <View style={[s.card, { alignItems: 'center' }]}>
                            <View style={[s.badgeCircle, { backgroundColor: '#27ae60' }]}>
                                <Ionicons name="checkmark" size={44} color="#fff" />
                            </View>
                            <Text style={s.cardTitle}>You're Verified! 🎉</Text>
                            <Text style={s.cardSubtitle}>
                                Your blue ✓ badge is now live. It's visible to everyone you chat with, match with, or browse.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={s.btn}
                            onPress={() => router.replace('/(tabs)/profile')}
                            activeOpacity={0.85}
                        >
                            <Text style={s.btnText}>Back to Profile</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'unconfirmed' && (
                    <View style={s.content}>
                        <View style={[s.card, { alignItems: 'center' }]}>
                            <View style={[s.badgeCircle, { backgroundColor: '#E74C3C' }]}>
                                <Ionicons name="mail-unread-outline" size={36} color="#fff" />
                            </View>
                            <Text style={s.cardTitle}>Email Not Confirmed</Text>
                            <Text style={s.cardSubtitle}>{message}</Text>
                        </View>

                        <TouchableOpacity
                            style={[s.btn, { backgroundColor: Colors.secondary.deepMaroon }]}
                            onPress={() => setStep('start')}
                            activeOpacity={0.85}
                        >
                            <Text style={s.btnText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#EDEDEA',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    container: { padding: 20, paddingBottom: 40 },
    content: { gap: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 28,
        alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    badgeCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#1DA1F2',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#1DA1F2', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 22, fontWeight: '800', color: Colors.secondary.deepMaroon,
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22,
    },

    howBox: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    howTitle: {
        fontSize: 14, fontWeight: '700', color: '#888',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
    },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    howText: { fontSize: 14, color: Colors.secondary.deepMaroon, flex: 1, lineHeight: 20 },

    btn: {
        backgroundColor: Colors.primary.forestGreen,
        paddingVertical: 17, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    btnDisabled: { backgroundColor: '#9DC4A4' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
