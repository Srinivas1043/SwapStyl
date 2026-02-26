import { useState } from 'react';
import * as Linking from 'expo-linking';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

export default function Signup() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Email verification flow state
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [resendCountdown, setResendCountdown] = useState(0);

    function validate(): string | null {
        if (!fullName.trim()) return 'Full name is required.';
        if (!email.trim()) return 'Email is required.';
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        if (password !== confirmPassword) return 'Passwords do not match.';
        return null;
    }

    async function signUpWithEmail() {
        const validationError = validate();
        if (validationError) { Alert.alert('Validation Error', validationError); return; }

        setLoading(true);
        try {
            const redirectTo = Linking.createURL('/(auth)/login');
            console.log('Signup Redirect URL:', redirectTo);

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: { full_name: fullName.trim() },
                    emailRedirectTo: redirectTo,
                },
            });

            if (signUpError) {
                Alert.alert('Sign Up Error', signUpError.message);
                return;
            }

            // User created successfully - now awaiting email verification
            setVerificationEmail(email.trim());
            setVerificationSent(true);
            startResendCountdown();
            
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    async function resendVerificationEmail() {
        if (resendCountdown > 0) return;
        
        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: verificationEmail,
            });

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            Alert.alert(
                'Email sent!',
                `Verification email sent to ${verificationEmail}`
            );
            startResendCountdown();
            
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
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    if (verificationSent) {
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.title}>📧 Verify Your Email</Text>
                    <Text style={styles.subtitle}>
                        We sent a confirmation link to
                    </Text>
                    <Text style={styles.emailDisplay}>{verificationEmail}</Text>
                    
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ✓ Click the link in the email to confirm your account{'\n'}
                            ✓ The link expires in 24 hours{'\n'}
                            ✓ Check your spam folder if you don't see it
                        </Text>
                    </View>

                    <Pressable
                        style={[
                            styles.button,
                            resendCountdown > 0 && styles.buttonDisabled
                        ]}
                        onPress={resendVerificationEmail}
                        disabled={resendCountdown > 0 || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.neutrals.white} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {resendCountdown > 0
                                    ? `Resend in ${resendCountdown}s`
                                    : 'Resend Email'}
                            </Text>
                        )}
                    </Pressable>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already verified?</Text>
                        <Pressable onPress={() => router.replace('/(auth)/login')}>
                            <Text style={styles.link}> Go to Login</Text>
                        </Pressable>
                    </View>

                    <View style={styles.supportBox}>
                        <Text style={styles.supportText}>
                            Didn't receive an email? Check your spam folder or{' '}
                            <Text style={styles.supportLink}>contact support</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }


    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
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
                    <TextInput
                        style={styles.input}
                        placeholder="Min. 6 characters"
                        onChangeText={setPassword}
                        value={password}
                        secureTextEntry
                        placeholderTextColor={Colors.neutrals.gray}
                        autoCapitalize="none"
                        editable={!loading}
                    />

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
                    onPress={signUpWithEmail}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </Text>
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
        flexGrow: 1,
        padding: 24,
        paddingTop: 60,
        justifyContent: 'center',
        backgroundColor: Colors.neutrals.white,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.secondary.deepMaroon,
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.neutrals.gray,
        textAlign: 'center',
        marginBottom: 32,
    },
    emailDisplay: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary.forestGreen,
        textAlign: 'center',
        marginBottom: 24,
        backgroundColor: Colors.neutrals.offWhite,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    infoBox: {
        backgroundColor: '#E8F5E9',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary.forestGreen,
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
    },
    infoText: {
        fontSize: 14,
        color: Colors.secondary.deepMaroon,
        lineHeight: 22,
    },
    supportBox: {
        backgroundColor: Colors.neutrals.offWhite,
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    supportText: {
        fontSize: 12,
        color: Colors.neutrals.gray,
        textAlign: 'center',
        lineHeight: 18,
    },
    supportLink: {
        color: Colors.primary.forestGreen,
        fontWeight: '600',
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.secondary.deepMaroon,
        marginBottom: 5,
        marginLeft: 2,
    },
    input: {
        height: 50,
        borderColor: '#E5E5E5',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 16,
        backgroundColor: Colors.neutrals.offWhite,
        fontSize: 15,
        color: Colors.secondary.deepMaroon,
    },
    button: {
        backgroundColor: Colors.secondary.deepMaroon,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    footerText: {
        color: Colors.neutrals.gray,
    },
    link: {
        color: Colors.primary.forestGreen,
        fontWeight: 'bold',
    },
});
