import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
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

    // Modes: 'email', 'phone', 'otp'
    const [authMode, setAuthMode] = useState<'email' | 'phone' | 'otp'>('email');

    async function signInWithEmail() {
        setLoading(true);
        console.log('Attempting login for:', email);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Login error:', error.message);
            Alert.alert(error.message);
            setLoading(false);
        } else {
            console.log('Login success:', data.user?.id);
            // Manual check/redirect to ensure something happens
            checkProfileAndRedirect(data.user!);
        }
    }

    async function checkProfileAndRedirect(user: any) {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', user.id)
                .single();

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
            // Route user correctly after phone login
            checkProfileAndRedirect(data.user);
        } else {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {authMode === 'email' ? 'Login' : authMode === 'phone' ? 'Phone Login' : 'Verify OTP'}
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
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            onChangeText={setPassword}
                            value={password}
                            secureTextEntry={true}
                            placeholderTextColor={Colors.neutrals.gray}
                            autoCapitalize="none"
                        />
                    </View>
                    <Pressable
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={signInWithEmail}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Login'}</Text>
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
                        />
                    </View>
                    <Pressable
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={sendOtp}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
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
                        />
                    </View>
                    <Pressable
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={verifyOtp}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
                    </Pressable>
                </>
            )}

            <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
                {authMode === 'email' ? (
                    <Pressable style={styles.socialButton} onPress={() => setAuthMode('phone')}>
                        <Text style={styles.socialButtonText}>Continue with Phone</Text>
                    </Pressable>
                ) : (
                    <Pressable style={styles.socialButton} onPress={() => setAuthMode('email')}>
                        <Text style={styles.socialButtonText}>Continue with Email</Text>
                    </Pressable>
                )}

                <Pressable style={[styles.socialButton, { marginTop: 10 }]} onPress={signInWithGoogle}>
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                </Pressable>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account?</Text>
                <Pressable onPress={() => router.replace('/(auth)/signup')}>
                    <Text style={styles.link}> Sign Up</Text>
                </Pressable>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: Colors.neutrals.white,
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
    input: {
        height: 50,
        borderColor: Colors.neutrals.gray,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        backgroundColor: Colors.neutrals.offWhite,
    },
    button: {
        backgroundColor: Colors.primary.forestGreen,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: Colors.neutrals.gray,
    },
    buttonText: {
        color: Colors.neutrals.white,
        fontWeight: 'bold',
        fontSize: 16,
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
    footerText: {
        color: Colors.neutrals.gray,
        marginRight: 5,
    },
    link: {
        color: Colors.primary.forestGreen,
        fontWeight: 'bold',
    },
});
