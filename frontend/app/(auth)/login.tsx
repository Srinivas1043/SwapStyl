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

    // Modes: 'email', 'phone', 'otp', 'forgot-password'
    const [authMode, setAuthMode] = useState<'email' | 'phone' | 'otp' | 'forgot-password'>('email');
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetCountdown, setResetCountdown] = useState(0);

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

    async function sendPasswordResetEmail() {
        if (!resetEmail) {
            Alert.alert('Email required', 'Please enter your email address');
            return;
        }

        if (resetCountdown > 0) return;

        setLoading(true);
        try {
            const redirectTo = Linking.createURL('/(auth)/reset-password');
            console.log('Reset Password Redirect URL:', redirectTo);

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
                redirectTo,
            });

            if (resetError) {
                Alert.alert('Error', resetError.message);
                setLoading(false);
                return;
            }

            setResetSent(true);
            startResetCountdown();
            Alert.alert(
                'Password reset email sent!',
                `Check ${resetEmail} for a link to reset your password.`
            );
        } catch (e: any) {
            Alert.alert('Error', e.message);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }

    function startResetCountdown() {
        setResetCountdown(60);
        const interval = setInterval(() => {
            setResetCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
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
                    <View style={styles.resetContainer}>
                        <Text style={styles.resetSubtitle}>
                            Enter your email address and we'll send you a link to reset your password.
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
                    </View>
                    <Pressable
                        style={[styles.button, (loading || resetCountdown > 0) && styles.buttonDisabled]}
                        onPress={sendPasswordResetEmail}
                        disabled={loading || resetCountdown > 0}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.neutrals.white} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {resetCountdown > 0 ? `Try again in ${resetCountdown}s` : 'Send Reset Link'}
                            </Text>
                        )}
                    </Pressable>
                    {resetSent && (
                        <View style={styles.successBox}>
                            <Text style={styles.successText}>
                                ✓ Check your email for a password reset link
                            </Text>
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
});
