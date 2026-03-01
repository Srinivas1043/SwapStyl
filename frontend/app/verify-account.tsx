import { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { authenticatedFetch } from '../lib/api';

type Step = 'email' | 'otp' | 'success';

export default function VerifyAccountScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSendCode() {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }
        setLoading(true);
        try {
            await authenticatedFetch('/auth/verify/request', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            setStep('otp');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify() {
        if (otp.trim().length < 6) {
            Alert.alert('Error', 'Please enter the 6-digit code from your email.');
            return;
        }
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            await authenticatedFetch('/auth/verify/confirm', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    token: otp.trim(),
                    user_id: user.id,
                }),
            });
            setStep('success');
        } catch (e: any) {
            Alert.alert('Invalid Code', e?.message || 'The code is incorrect or expired. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={s.header}>
                        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                            <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Get Verified</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    {step === 'email' && (
                        <View style={s.content}>
                            <View style={s.badgePreview}>
                                <View style={s.badgeCircle}>
                                    <Ionicons name="checkmark" size={32} color="#fff" />
                                </View>
                                <Text style={s.badgeTitle}>Verified Badge</Text>
                                <Text style={s.badgeSubtitle}>
                                    Verify your email to get a blue ✓ badge on your profile,
                                    visible to everyone you interact with.
                                </Text>
                            </View>

                            <Text style={s.label}>Your Email Address</Text>
                            <TextInput
                                style={s.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="you@example.com"
                                placeholderTextColor="#BBB"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <TouchableOpacity
                                style={[s.btn, loading && s.btnDisabled]}
                                onPress={handleSendCode}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={s.btnText}>Send Verification Code</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 'otp' && (
                        <View style={s.content}>
                            <View style={s.infoBox}>
                                <Ionicons name="mail-outline" size={28} color={Colors.primary.forestGreen} />
                                <Text style={s.infoTitle}>Check Your Email</Text>
                                <Text style={s.infoText}>
                                    We sent a 6-digit code to{'\n'}
                                    <Text style={{ fontWeight: '700' }}>{email}</Text>
                                </Text>
                            </View>

                            <Text style={s.label}>Enter 6-Digit Code</Text>
                            <TextInput
                                style={[s.input, s.otpInput]}
                                value={otp}
                                onChangeText={setOtp}
                                placeholder="000000"
                                placeholderTextColor="#BBB"
                                keyboardType="number-pad"
                                maxLength={6}
                            />

                            <TouchableOpacity
                                style={[s.btn, loading && s.btnDisabled]}
                                onPress={handleVerify}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={s.btnText}>Verify Account</Text>
                                }
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={s.resendBtn}
                                onPress={() => { setOtp(''); setStep('email'); }}
                            >
                                <Text style={s.resendText}>Didn't receive it? Go back and retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 'success' && (
                        <View style={s.content}>
                            <View style={s.successBox}>
                                <View style={s.badgeCircle}>
                                    <Ionicons name="checkmark" size={40} color="#fff" />
                                </View>
                                <Text style={s.successTitle}>You're Verified! 🎉</Text>
                                <Text style={s.successText}>
                                    Your blue ✓ badge is now active on your profile and visible
                                    to all users you chat with or match with.
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={s.btn}
                                onPress={() => router.replace('/(tabs)/profile')}
                                activeOpacity={0.8}
                            >
                                <Text style={s.btnText}>Back to Profile</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#EDEDEA',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    container: { padding: 20, gap: 20 },
    content: { gap: 16 },

    // Badge preview
    badgePreview: {
        backgroundColor: '#fff', borderRadius: 20, padding: 24,
        alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    badgeCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#1DA1F2',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#1DA1F2', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    },
    badgeTitle: { fontSize: 20, fontWeight: '800', color: Colors.secondary.deepMaroon },
    badgeSubtitle: {
        fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20,
    },

    // Info box (OTP step)
    infoBox: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20,
        alignItems: 'center', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    infoTitle: { fontSize: 17, fontWeight: '700', color: Colors.secondary.deepMaroon },
    infoText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },

    // Success step
    successBox: {
        backgroundColor: '#fff', borderRadius: 20, padding: 28,
        alignItems: 'center', gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: Colors.secondary.deepMaroon },
    successText: {
        fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22,
    },

    // Form
    label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: -8 },
    input: {
        backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16,
        paddingVertical: 14, fontSize: 16, color: Colors.secondary.deepMaroon,
        borderWidth: 1, borderColor: '#E0DDD8',
    },
    otpInput: {
        fontSize: 28, fontWeight: '700', letterSpacing: 8,
        textAlign: 'center',
    },

    // Buttons
    btn: {
        backgroundColor: Colors.primary.forestGreen,
        paddingVertical: 16, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    btnDisabled: { backgroundColor: '#9DC4A4' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    resendBtn: { alignItems: 'center', paddingVertical: 8 },
    resendText: { color: Colors.primary.forestGreen, fontSize: 14, fontWeight: '500' },
});
