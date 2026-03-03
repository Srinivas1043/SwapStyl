import { useState, useRef } from 'react';
import {
    View, Text, TextInput, StyleSheet, Pressable,
    Alert, ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

type Step = 'form' | 'otp' | 'welcome';

export default function Signup() {
    const router = useRouter();

    // ── Form state
    const [step, setStep] = useState<Step>('form');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // ── OTP state
    const [otp, setOtp] = useState('');
    const [resendCountdown, setResendCountdown] = useState(0);

    // ── Validation
    function validate(): string | null {
        if (!fullName.trim()) return 'Full name is required.';
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return 'Please enter a valid email address.';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        if (password !== confirmPassword) return 'Passwords do not match.';
        return null;
    }

    // ── Step 1: Create account
    async function handleSignUp() {
        const err = validate();
        if (err) { Alert.alert('Validation Error', err); return; }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { full_name: fullName.trim() } },
            });
            if (error) { Alert.alert('Sign Up Error', error.message); return; }

            startResendCountdown();
            setStep('otp');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    // ── Step 2: Confirm OTP
    async function handleVerifyOtp() {
        if (otp.trim().length !== 8) {
            Alert.alert('Code required', 'Please enter the full 8-digit code from your email.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://swapstyl.onrender.com'}/auth/signup/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), token: otp.trim() }),
            });
            const data = await res.json();
            if (data?.success) {
                setStep('welcome');
            } else {
                Alert.alert('Invalid code', data?.detail || data?.message || 'Try again or request a new code.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // ── Resend OTP
    async function handleResend() {
        if (resendCountdown > 0) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
            if (error) { Alert.alert('Error', error.message); return; }
            setOtp('');
            startResendCountdown();
            Alert.alert('Code sent!', `A new code was sent to ${email.trim()}`);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    function startResendCountdown() {
        setResendCountdown(60);
        const interval = setInterval(() => {
            setResendCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    // ────────────────────────────────────────────────────────────
    // STEP: WELCOME
    if (step === 'welcome') {
        return (
            <ScrollView contentContainerStyle={styles.centerContainer}>
                <View style={styles.welcomeCard}>
                    <View style={styles.welcomeIcon}>
                        <Ionicons name="checkmark" size={48} color="#fff" />
                    </View>
                    <Text style={styles.welcomeTitle}>Welcome to SwapStyl! 🎉</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Your email is confirmed and your account is verified.{'\n'}
                        You're ready to start swapping!
                    </Text>
                    <View style={styles.verifiedBadgeRow}>
                        <View style={styles.miniVerifiedBadge}>
                            <Ionicons name="checkmark" size={11} color="#fff" />
                        </View>
                        <Text style={styles.verifiedText}>Verified badge added to your profile</Text>
                    </View>
                    <Pressable style={styles.button} onPress={() => router.replace('/onboarding/preferences')}>
                        <Text style={styles.buttonText}>Set Up My Preferences →</Text>
                    </Pressable>
                </View>
            </ScrollView>
        );
    }

    // ────────────────────────────────────────────────────────────
    // STEP: OTP ENTRY
    if (step === 'otp') {
        return (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Pressable onPress={() => setStep('form')} style={styles.backRow}>
                        <Ionicons name="chevron-back" size={20} color={Colors.primary.forestGreen} />
                        <Text style={styles.backText}>Back</Text>
                    </Pressable>

                    <View style={styles.otpHeader}>
                        <Ionicons name="mail-open-outline" size={52} color={Colors.primary.forestGreen} />
                        <Text style={styles.title}>Check Your Email</Text>
                        <Text style={styles.subtitle}>
                            We sent an 8-digit confirmation code to{'\n'}
                            <Text style={styles.emailHighlight}>{email.trim()}</Text>
                        </Text>
                    </View>

                    <TextInput
                        style={styles.otpInput}
                        value={otp}
                        onChangeText={v => setOtp(v.replace(/[^0-9]/g, ''))}
                        placeholder="00000000"
                        placeholderTextColor="#CCC"
                        keyboardType="number-pad"
                        maxLength={8}
                        autoFocus
                        textAlign="center"
                    />

                    <Pressable
                        style={[styles.button, (loading || otp.length < 8) && styles.buttonDisabled]}
                        onPress={handleVerifyOtp}
                        disabled={loading || otp.length < 8}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.buttonText}>Confirm Account</Text>
                        }
                    </Pressable>

                    <Pressable
                        style={[styles.resendBtn, resendCountdown > 0 && { opacity: 0.5 }]}
                        onPress={handleResend}
                        disabled={resendCountdown > 0 || loading}
                    >
                        <Text style={styles.resendText}>
                            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Didn't receive it? Resend code"}
                        </Text>
                    </Pressable>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ✓ Check spam if not in inbox{'\n'}
                            ✓ Code expires in 1 hour
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // ────────────────────────────────────────────────────────────
    // STEP: SIGN UP FORM
    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join SwapStyl and start swapping!</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Jane Doe"
                        onChangeText={setFullName}
                        value={fullName}
                        placeholderTextColor={Colors.neutrals.gray}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                    <Text style={styles.label}>Email *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        onChangeText={setEmail}
                        value={email}
                        placeholderTextColor={Colors.neutrals.gray}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />
                    <Text style={styles.label}>Password *</Text>
                    <View style={styles.passwordRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder="Min. 6 characters"
                            onChangeText={setPassword}
                            value={password}
                            secureTextEntry={!showPassword}
                            placeholderTextColor={Colors.neutrals.gray}
                            autoCapitalize="none"
                            editable={!loading}
                        />
                        <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.neutrals.gray} />
                        </Pressable>
                    </View>
                    <View style={{ height: 16 }} />
                    <Text style={styles.label}>Confirm Password *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Repeat your password"
                        onChangeText={setConfirmPassword}
                        value={confirmPassword}
                        secureTextEntry
                        placeholderTextColor={Colors.neutrals.gray}
                        autoCapitalize="none"
                        editable={!loading}
                    />
                </View>

                <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSignUp}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Create Account</Text>
                    }
                </Pressable>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <Pressable onPress={() => router.replace('/(auth)/login')} disabled={loading}>
                        <Text style={styles.link}> Login</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1, padding: 24, paddingTop: 60, justifyContent: 'center',
        backgroundColor: Colors.neutrals.white,
    },
    centerContainer: {
        flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F7F5F0',
    },
    title: {
        fontSize: 28, fontWeight: 'bold', color: Colors.secondary.deepMaroon,
        textAlign: 'center', marginBottom: 6,
    },
    subtitle: {
        fontSize: 14, color: Colors.neutrals.gray, textAlign: 'center',
        marginBottom: 28, lineHeight: 20,
    },
    emailHighlight: { fontWeight: '700', color: Colors.secondary.deepMaroon },
    inputContainer: { marginBottom: 20 },
    label: {
        fontSize: 13, fontWeight: '600', color: Colors.secondary.deepMaroon,
        marginBottom: 5, marginLeft: 2,
    },
    input: {
        height: 50, borderColor: '#E5E5E5', borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 15, marginBottom: 16, backgroundColor: Colors.neutrals.offWhite,
        fontSize: 15, color: Colors.secondary.deepMaroon,
    },
    passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
    eyeBtn: { paddingHorizontal: 12, paddingVertical: 14 },
    button: {
        backgroundColor: Colors.secondary.deepMaroon, paddingVertical: 16,
        borderRadius: 12, alignItems: 'center', marginBottom: 16,
        minHeight: 52, justifyContent: 'center',
    },
    buttonDisabled: { backgroundColor: Colors.neutrals.gray, opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    footerText: { color: Colors.neutrals.gray },
    link: { color: Colors.primary.forestGreen, fontWeight: 'bold' },

    // OTP step
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backText: { color: Colors.primary.forestGreen, fontWeight: '600', fontSize: 14 },
    otpHeader: { alignItems: 'center', gap: 12, marginBottom: 28 },
    otpInput: {
        width: '100%', height: 70, fontSize: 32, fontWeight: '700',
        letterSpacing: 10, color: Colors.secondary.deepMaroon,
        borderWidth: 2, borderColor: Colors.primary.forestGreen, borderRadius: 14,
        marginBottom: 20, textAlign: 'center',
    },
    resendBtn: { alignItems: 'center', paddingVertical: 12 },
    resendText: { color: Colors.primary.forestGreen, fontWeight: '600', fontSize: 13 },
    infoBox: {
        backgroundColor: '#E8F5E9', borderLeftWidth: 4,
        borderLeftColor: Colors.primary.forestGreen, padding: 14,
        borderRadius: 8, marginTop: 16,
    },
    infoText: { fontSize: 13, color: Colors.secondary.deepMaroon, lineHeight: 22 },

    // Welcome step
    welcomeCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%',
        alignItems: 'center', gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
    },
    welcomeIcon: {
        width: 90, height: 90, borderRadius: 45, backgroundColor: '#27ae60',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#27ae60', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginBottom: 4,
    },
    welcomeTitle: { fontSize: 24, fontWeight: '800', color: Colors.secondary.deepMaroon, textAlign: 'center' },
    welcomeSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
    verifiedBadgeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#EBF5FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    },
    miniVerifiedBadge: {
        width: 20, height: 20, borderRadius: 10, backgroundColor: '#1DA1F2',
        alignItems: 'center', justifyContent: 'center',
    },
    verifiedText: { fontSize: 13, color: '#1DA1F2', fontWeight: '600' },
});
