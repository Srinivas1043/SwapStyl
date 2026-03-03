import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import * as Linking from 'expo-linking';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const [authMode, setAuthMode] = useState<'email' | 'phone' | 'otp' | 'forgot-password'>('email');
    // forgot-password phases: 'email' → 'otp' → 'new-password'
    const [resetPhase, setResetPhase] = useState<'email' | 'otp' | 'new-password'>('email');
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [resetCountdown, setResetCountdown] = useState(0);
    const [resetSuccess, setResetSuccess] = useState(false);
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://swapstyl.onrender.com';

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Missing fields', 'Please enter email and password');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            Alert.alert('Login failed', error.message);
            setLoading(false);
        } else {
            checkProfileAndRedirect(data.user!);
        }
    }

    async function checkProfileAndRedirect(user: any) {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('preferences, email_verified')
                .eq('id', user.id)
                .single();

            // Check if email is verified
            if (!user.email_confirmed_at && !profile?.email_verified) {
                Alert.alert(
                    'Email not verified',
                    'Please verify your email before logging in.',
                    [{ text: 'OK', onPress: () => setLoading(false) }]
                );
                return;
            }

            if (profile?.preferences && Object.keys(profile.preferences).length > 0) {
                router.replace('/(tabs)');
            } else {
                router.replace('/onboarding/preferences');
            }
        } catch (e) {
            console.error('Profile check error:', e);
            router.replace('/onboarding/preferences');
        } finally {
            setLoading(false);
        }
    }

    async function signInWithGoogle() {
        setLoading(true);
        try {
            const redirectUrl = Linking.createURL('/(tabs)');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                },
            });
            if (error) throw error;
            if (data.url) await Linking.openURL(data.url);
        } catch (error: any) {
            Alert.alert(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function sendOtp() {
        if (!phone) {
            Alert.alert('Phone required', 'Please enter your phone number');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            phone: phone,
        });
        if (error) Alert.alert(error.message);
        else {
            setAuthMode('otp');
            Alert.alert('OTP sent to your phone!');
        }
        setLoading(false);
    }

    async function verifyOtp() {
        if (!otp) {
            Alert.alert('OTP required', 'Please enter the OTP');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({
            phone: phone,
            token: otp,
            type: 'sms',
        });
        if (error) {
            Alert.alert(error.message);
            setLoading(false);
        } else if (data.user) {
            checkProfileAndRedirect(data.user);
        } else {
            setLoading(false);
        }
    }

    // ── Forgot password: Phase 1 — send OTP
    async function sendPasswordResetOtp() {
        if (!resetEmail.trim()) {
            Alert.alert('Email required', 'Please enter your email address');
            return;
        }
        if (resetCountdown > 0) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/password/reset-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail.trim() }),
            });
            const data = await res.json();
            if (data?.success) {
                setResetOtp('');
                setResetPhase('otp');
                startResetCountdown();
            } else {
                Alert.alert('Error', data?.detail || 'Failed to send code.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    // ── Forgot password: Phase 2 — verify OTP
    async function verifyResetOtp() {
        if (resetOtp.trim().length !== 8) {
            Alert.alert('Code required', 'Please enter the 8-digit code.');
            return;
        }
        setResetPhase('new-password');
    }

    // ── Forgot password: Phase 3 — set new password
    async function submitNewPassword() {
        if (newPassword.length < 6) {
            Alert.alert('Too short', 'Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/password/reset-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: resetEmail.trim(),
                    token: resetOtp.trim(),
                    new_password: newPassword,
                }),
            });
            const data = await res.json();
            if (data?.success) {
                setResetSuccess(true);
                Alert.alert(
                    'Password updated! ✓',
                    'Your password has been reset. You can now log in.',
                    [{ text: 'Log In', onPress: () => { setAuthMode('email'); setResetPhase('email'); setResetSuccess(false); } }]
                );
            } else {
                Alert.alert('Error', data?.detail || 'Password reset failed. The code may have expired.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    function startResetCountdown() {
        setResetCountdown(60);
        const interval = setInterval(() => {
            setResetCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.neutrals.white }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>
                    {authMode === 'email' ? 'Login' : authMode === 'phone' ? 'Phone Login' : authMode === 'otp' ? 'Verify OTP' : 'Reset Password'}
                </Text>

                {authMode === 'email' && (
                    <>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                onChangeText={setEmail}
                                value={email}
                                placeholderTextColor={Colors.neutrals.gray}
                                autoCapitalize="none"
                                editable={!loading}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                onChangeText={setPassword}
                                value={password}
                                secureTextEntry={true}
                                placeholderTextColor={Colors.neutrals.gray}
                                autoCapitalize="none"
                                editable={!loading}
                            />
                        </View>
                        <Pressable
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={signInWithEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.neutrals.white} />
                            ) : (
                                <Text style={styles.buttonText}>Login</Text>
                            )}
                        </Pressable>
                        <Pressable onPress={() => { setAuthMode('forgot-password'); setResetEmail(''); }} disabled={loading}>
                            <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                        </Pressable>
                    </>
                )}

                {authMode === 'phone' && (
                    <>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number (e.g., +1234567890)"
                                onChangeText={setPhone}
                                value={phone}
                                placeholderTextColor={Colors.neutrals.gray}
                                keyboardType="phone-pad"
                                editable={!loading}
                            />
                        </View>
                        <Pressable
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={sendOtp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.neutrals.white} />
                            ) : (
                                <Text style={styles.buttonText}>Send OTP</Text>
                            )}
                        </Pressable>
                    </>
                )}

                {authMode === 'otp' && (
                    <>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-digit OTP"
                                onChangeText={setOtp}
                                value={otp}
                                placeholderTextColor={Colors.neutrals.gray}
                                keyboardType="number-pad"
                                editable={!loading}
                            />
                        </View>
                        <Pressable
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={verifyOtp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.neutrals.white} />
                            ) : (
                                <Text style={styles.buttonText}>Verify OTP</Text>
                            )}
                        </Pressable>
                    </>
                )}

                {authMode === 'forgot-password' && (
                    <>
                        {/* Phase 1: Enter email */}
                        {resetPhase === 'email' && (
                            <View style={styles.resetContainer}>
                                <Text style={styles.resetSubtitle}>
                                    Enter your email and we'll send you an 8-digit reset code.
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your email address"
                                    onChangeText={setResetEmail}
                                    value={resetEmail}
                                    placeholderTextColor={Colors.neutrals.gray}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!loading}
                                />
                                <Pressable
                                    style={[styles.button, (loading || resetCountdown > 0) && styles.buttonDisabled]}
                                    onPress={sendPasswordResetOtp}
                                    disabled={loading || resetCountdown > 0}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.buttonText}>
                                            {resetCountdown > 0 ? `Try again in ${resetCountdown}s` : 'Send Reset Code'}
                                        </Text>
                                    }
                                </Pressable>
                            </View>
                        )}

                        {/* Phase 2: Enter OTP code */}
                        {resetPhase === 'otp' && (
                            <View style={styles.resetContainer}>
                                <Text style={styles.resetSubtitle}>
                                    Enter the 8-digit code sent to{' '}
                                    <Text style={{ fontWeight: '700', color: Colors.secondary.deepMaroon }}>{resetEmail}</Text>
                                </Text>
                                <TextInput
                                    style={[styles.input, styles.otpInputStyle]}
                                    placeholder="00000000"
                                    onChangeText={v => setResetOtp(v.replace(/[^0-9]/g, ''))}
                                    value={resetOtp}
                                    placeholderTextColor="#CCC"
                                    keyboardType="number-pad"
                                    maxLength={8}
                                    autoFocus
                                    textAlign="center"
                                />
                                <Pressable
                                    style={[styles.button, (loading || resetOtp.length < 8) && styles.buttonDisabled]}
                                    onPress={verifyResetOtp}
                                    disabled={loading || resetOtp.length < 8}
                                >
                                    <Text style={styles.buttonText}>Verify Code</Text>
                                </Pressable>
                                <Pressable style={styles.resendLink} onPress={() => { setResetPhase('email'); setResetOtp(''); }}>
                                    <Text style={styles.resendLinkText}>← Change email or resend</Text>
                                </Pressable>
                            </View>
                        )}

                        {/* Phase 3: New password */}
                        {resetPhase === 'new-password' && (
                            <View style={styles.resetContainer}>
                                <Text style={styles.resetSubtitle}>Create a new password for your account.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="New password (min. 6 chars)"
                                    onChangeText={setNewPassword}
                                    value={newPassword}
                                    secureTextEntry
                                    placeholderTextColor={Colors.neutrals.gray}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm new password"
                                    onChangeText={setConfirmNewPassword}
                                    value={confirmNewPassword}
                                    secureTextEntry
                                    placeholderTextColor={Colors.neutrals.gray}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                                <Pressable
                                    style={[styles.button, loading && styles.buttonDisabled]}
                                    onPress={submitNewPassword}
                                    disabled={loading}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.buttonText}>Update Password</Text>
                                    }
                                </Pressable>
                            </View>
                        )}
                    </>
                )}

                {authMode !== 'forgot-password' && (
                    <>
                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.divider} />
                        </View>

                        <View style={styles.socialContainer}>
                            {authMode === 'email' ? (
                                <Pressable style={styles.socialButton} onPress={() => setAuthMode('phone')} disabled={loading}>
                                    <Text style={styles.socialButtonText}>Continue with Phone</Text>
                                </Pressable>
                            ) : (
                                <Pressable style={styles.socialButton} onPress={() => setAuthMode('email')} disabled={loading}>
                                    <Text style={styles.socialButtonText}>Continue with Email</Text>
                                </Pressable>
                            )}

                            <Pressable style={[styles.socialButton, { marginTop: 10 }]} onPress={signInWithGoogle} disabled={loading}>
                                <Text style={styles.socialButtonText}>Continue with Google</Text>
                            </Pressable>
                        </View>
                    </>
                )}

                {authMode === 'forgot-password' ? (
                    <Pressable onPress={() => setAuthMode('email')}>
                        <Text style={styles.backLink}>← Back to Login</Text>
                    </Pressable>
                ) : (
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account?</Text>
                        <Pressable onPress={() => router.replace('/(auth)/signup')} disabled={loading}>
                            <Text style={styles.link}> Sign Up</Text>
                        </Pressable>
                    </View>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: Colors.secondary.deepMaroon,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    resetContainer: {
        marginBottom: 20,
    },
    resetSubtitle: {
        fontSize: 14,
        color: Colors.neutrals.gray,
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 20,
    },
    input: {
        height: 50,
        borderColor: Colors.neutrals.gray,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        backgroundColor: Colors.neutrals.offWhite,
        fontSize: 15,
        color: Colors.secondary.deepMaroon,
    },
    button: {
        backgroundColor: Colors.primary.forestGreen,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        minHeight: 50,
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: Colors.neutrals.gray,
        opacity: 0.6,
    },
    buttonText: {
        color: Colors.neutrals.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    forgotPasswordLink: {
        textAlign: 'center',
        marginTop: 12,
        color: Colors.primary.forestGreen,
        fontSize: 14,
        fontWeight: '600',
    },
    successBox: {
        backgroundColor: '#E8F5E9',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary.forestGreen,
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    successText: {
        fontSize: 14,
        color: Colors.secondary.deepMaroon,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.neutrals.gray,
    },
    dividerText: {
        marginHorizontal: 10,
        color: Colors.neutrals.gray,
    },
    socialContainer: {
        marginBottom: 20,
    },
    socialButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.secondary.deepMaroon,
        backgroundColor: 'transparent',
    },
    socialButtonText: {
        color: Colors.secondary.deepMaroon,
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backLink: {
        textAlign: 'center',
        color: Colors.primary.forestGreen,
        fontWeight: '600',
        fontSize: 14,
        marginTop: 12,
    },
    footerText: {
        color: Colors.neutrals.gray,
        marginRight: 5,
    },
    link: {
        color: Colors.primary.forestGreen,
        fontWeight: 'bold',
    },
    otpInputStyle: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 10,
        textAlign: 'center',
        borderColor: Colors.primary.forestGreen,
        borderWidth: 2,
    },
    resendLink: { alignItems: 'center', paddingVertical: 10 },
    resendLinkText: { color: Colors.primary.forestGreen, fontWeight: '600', fontSize: 13 },
});
