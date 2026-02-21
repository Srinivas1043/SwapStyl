import { useState } from 'react';
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

    function validate(): string | null {
        if (!fullName.trim()) return 'Full name is required.';
        if (!email.trim()) return 'Email is required.';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        if (password !== confirmPassword) return 'Passwords do not match.';
        return null;
    }

    async function signUpWithEmail() {
        const validationError = validate();
        if (validationError) { Alert.alert('Validation Error', validationError); return; }

        setLoading(true);
        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: { full_name: fullName.trim() },
                },
            });

            if (signUpError) {
                Alert.alert('Sign Up Error', signUpError.message);
                return;
            }

            if (data.session) {
                router.replace('/onboarding/preferences');
            } else {
                Alert.alert(
                    'Verify your email',
                    'We sent a confirmation link to ' + email.trim() + '. Please verify then log in.',
                    [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
                );
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
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
                    <Pressable onPress={() => router.replace('/(auth)/login')}>
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
    },
    buttonDisabled: {
        backgroundColor: Colors.neutrals.gray,
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
