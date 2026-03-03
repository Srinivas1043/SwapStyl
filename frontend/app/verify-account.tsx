import { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { authenticatedFetch } from '../lib/api';

type Step = 'start' | 'otp' | 'success';

export default function VerifyAccountScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('start');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sentEmail, setSentEmail] = useState('');
    const [otp, setOtp] = useState('');

    // ── Step 1: Send OTP ──────────────────────────────────────────
    async function handleSendCode() {
        setLoading(true);
        setError('');
        try {
            const res = await authenticatedFetch('/auth/verify/request', { method: 'POST' });
            if (res?.success) {
                setSentEmail(res.email || '');
                setStep('otp');
            } else {
                setError(res?.message || 'Failed to send code. Try again.');
            }
        } catch (e: any) {
            setError(e?.message || 'Could not send code. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // ── Step 2: Confirm OTP ───────────────────────────────────────
    async function handleConfirm() {
        if (otp.trim().length !== 8) {
            setError('Please enter the full 8-digit code.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await authenticatedFetch('/auth/verify/confirm', {
                method: 'POST',
                body: JSON.stringify({ email: sentEmail, token: otp.trim() }),
            });
            if (res?.success) {
                setStep('success');
            } else {
                setError(res?.message || 'Invalid code. Please try again.');
            }
        } catch (e: any) {
            setError(e?.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Get Verified</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">

                {/* ── Step 1: Start ── */}
                {step === 'start' && (
                    <View style={s.content}>
                        <View style={s.heroCard}>
                            <View style={s.badgeCircle}>
                                <Ionicons name="checkmark" size={38} color="#fff" />
                            </View>
                            <Text style={s.heroTitle}>Get Your Verified Badge</Text>
                            <Text style={s.heroSubtitle}>
                                Verify your email to get a blue ✓ badge. It appears on your profile, in chats, and everywhere your name shows.
                            </Text>
                        </View>

                        <View style={s.stepsBox}>
                            <Text style={s.stepsTitle}>How it works</Text>
                            {[
                                { icon: 'mail-outline', text: 'We send an 8-digit code to your registered email' },
                                { icon: 'keypad-outline', text: 'Enter the code to verify your account' },
                                { icon: 'shield-checkmark-outline', text: 'Blue ✓ badge activates instantly' },
                            ].map((item, i) => (
                                <View key={i} style={s.stepRow}>
                                    <View style={s.stepIcon}>
                                        <Ionicons name={item.icon as any} size={18} color={Colors.primary.forestGreen} />
                                    </View>
                                    <Text style={s.stepText}>{item.text}</Text>
                                </View>
                            ))}
                        </View>

                        {error ? <Text style={s.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[s.btn, loading && s.btnDisabled]}
                            onPress={handleSendCode}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <Ionicons name="send-outline" size={18} color="#fff" />
                                    <Text style={s.btnText}>Send Verification Code</Text>
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Step 2: Enter OTP ── */}
                {step === 'otp' && (
                    <View style={s.content}>
                        <View style={s.heroCard}>
                            <View style={[s.badgeCircle, { backgroundColor: Colors.primary.forestGreen }]}>
                                <Ionicons name="mail-open-outline" size={38} color="#fff" />
                            </View>
                            <Text style={s.heroTitle}>Check Your Email</Text>
                            <Text style={s.heroSubtitle}>
                                We sent an 8-digit code to{'\n'}
                                <Text style={{ fontWeight: '700', color: Colors.secondary.deepMaroon }}>
                                    {sentEmail}
                                </Text>
                                {'\n\n'}Enter the code below to verify your account.
                            </Text>
                        </View>

                        <View style={s.otpBox}>
                            <TextInput
                                style={s.otpInput}
                                value={otp}
                                onChangeText={v => { setOtp(v.replace(/[^0-9]/g, '')); setError(''); }}
                                placeholder="00000000"
                                placeholderTextColor="#CCC"
                                keyboardType="number-pad"
                                maxLength={8}
                                autoFocus
                                textAlign="center"
                            />
                        </View>

                        {error ? <Text style={s.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[s.btn, (loading || otp.length < 8) && s.btnDisabled]}
                            onPress={handleConfirm}
                            disabled={loading || otp.length < 8}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                    <Text style={s.btnText}>Verify Account</Text>
                                </>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity style={s.resendBtn} onPress={() => { setOtp(''); setStep('start'); }}>
                            <Text style={s.resendText}>Didn't receive a code? Tap to resend</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Step 3: Success ── */}
                {step === 'success' && (
                    <View style={s.content}>
                        <View style={s.heroCard}>
                            <View style={[s.badgeCircle, { backgroundColor: '#27ae60' }]}>
                                <Ionicons name="checkmark" size={44} color="#fff" />
                            </View>
                            <Text style={s.heroTitle}>You're Verified! 🎉</Text>
                            <Text style={s.heroSubtitle}>
                                Your blue ✓ badge is now live. It's visible to everyone you interact with on SwapStyl.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={s.btn}
                            onPress={() => router.replace('/(tabs)/profile')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="person-outline" size={18} color="#fff" />
                            <Text style={s.btnText}>View My Profile</Text>
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
    container: { padding: 20, paddingBottom: 48 },
    content: { gap: 16 },

    heroCard: {
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
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
        marginBottom: 4,
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: Colors.secondary.deepMaroon, textAlign: 'center' },
    heroSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },

    stepsBox: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    stepsTitle: {
        fontSize: 12, fontWeight: '700', color: '#888',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
    },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepIcon: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#F0FAF2',
        alignItems: 'center', justifyContent: 'center',
    },
    stepText: { fontSize: 14, color: Colors.secondary.deepMaroon, flex: 1, lineHeight: 20 },

    otpBox: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    otpInput: {
        width: '100%', height: 64, fontSize: 28, fontWeight: '700',
        letterSpacing: 12, color: Colors.secondary.deepMaroon,
        borderWidth: 2, borderColor: '#1DA1F2', borderRadius: 14,
        paddingHorizontal: 16, textAlign: 'center',
    },

    btn: {
        backgroundColor: Colors.primary.forestGreen,
        paddingVertical: 17, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    btnDisabled: { backgroundColor: '#A8C4AC', opacity: 0.7 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    resendBtn: { alignItems: 'center', paddingVertical: 8 },
    resendText: { fontSize: 13, color: Colors.primary.forestGreen, fontWeight: '600' },

    errorText: {
        color: '#E74C3C', fontSize: 13, textAlign: 'center',
        fontWeight: '500', paddingHorizontal: 8,
    },
});
