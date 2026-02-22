import { useState, useEffect } from 'react';
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
import { useRouter, useSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';

export default function ResetPassword() {
    const router = useRouter();
    const params = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetComplete, setResetComplete] = useState(false);

    useEffect(() => {
        // When user clicks the reset link from email, Supabase sets up the session
        // We just need to prepare the form
    }, []);

    function validate(): string | null {
        if (newPassword.length < 6) return 'Password must be at least 6 characters.';
        if (newPassword !== confirmPassword) return 'Passwords do not match.';
        return null;
    }

    async function updatePassword() {
        const validationError = validate();
        if (validationError) {
            Alert.alert('Validation Error', validationError);
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                Alert.alert('Error', error.message);
                setLoading(false);
                return;
            }

            setResetComplete(true);
            Alert.alert(
                'Password updated!',
                'Your password has been successfully reset. You can now log in with your new password.',
                [
                    {
                        text: 'Go to Login',
                        onPress: () => router.replace('/(auth)/login'),
                    },
                ]
            );
        } catch (e: any) {
            Alert.alert('Error', e.message);
            setLoading(false);
        }
    }

    if (resetComplete) {
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.successContainer}>
                        <Text style={styles.successEmoji}>✓</Text>
                        <Text style={styles.title}>Password Reset Successful!</Text>
                        <Text style={styles.subtitle}>
                            Your password has been successfully updated. You can now log in with your new password.
                        </Text>
                        <Pressable
                            style={styles.button}
                            onPress={() => router.replace('/(auth)/login')}
                        >
                            <Text style={styles.buttonText}>Go to Login</Text>
                        </Pressable>
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
                <Text style={styles.title}>Create New Password</Text>
                <Text style={styles.subtitle}>
                    Enter a new password for your SwapStyl account.
                </Text>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        🔒 Password must be at least 6 characters long
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Min. 6 characters"
                        onChangeText={setNewPassword}
                        value={newPassword}
                        secureTextEntry
                        placeholderTextColor={Colors.neutrals.gray}
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    <Text style={styles.label}>Confirm Password *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Re-enter your password"
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
                    onPress={updatePassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.neutrals.white} />
                    ) : (
                        <Text style={styles.buttonText}>Update Password</Text>
                    )}
                </Pressable>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Remember your password?</Text>
                    <Pressable onPress={() => router.replace('/(auth)/login')} disabled={loading}>
                        <Text style={styles.link}> Back to Login</Text>
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
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.neutrals.gray,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    successEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    infoBox: {
        backgroundColor: '#E3F2FD',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary.forestGreen,
        padding: 14,
        borderRadius: 8,
        marginBottom: 24,
    },
    infoText: {
        fontSize: 13,
        color: Colors.secondary.deepMaroon,
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.secondary.deepMaroon,
        marginBottom: 6,
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
        marginTop: 16,
    },
    footerText: {
        color: Colors.neutrals.gray,
        fontSize: 14,
    },
    link: {
        color: Colors.primary.forestGreen,
        fontWeight: 'bold',
    },
});
