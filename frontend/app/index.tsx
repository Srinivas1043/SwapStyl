import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function Welcome() {
    const router = useRouter();

    // Navigation is handled by RootLayout now

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                {/* Placeholder for Logo */}
                <Text style={styles.logoText}>SwapStyl</Text>
                <Text style={styles.tagline}>Your next favourite outfit is waiting!</Text>
            </View>

            <View style={styles.buttonContainer}>
                <Link href="/(auth)/login" asChild>
                    <Pressable style={styles.loginButton}>
                        <Text style={styles.loginButtonText}>Login</Text>
                    </Pressable>
                </Link>

                <Link href="/(auth)/signup" asChild>
                    <Pressable style={styles.signupButton}>
                        <Text style={styles.signupButtonText}>Sign Up</Text>
                    </Pressable>
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutrals.beige,
        justifyContent: 'space-between',
        padding: 20,
        paddingVertical: 50,
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.primary.forestGreen,
        marginBottom: 10,
    },
    tagline: {
        fontSize: 18,
        color: Colors.secondary.deepMaroon,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
        gap: 15,
    },
    loginButton: {
        backgroundColor: Colors.primary.forestGreen,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    loginButtonText: {
        color: Colors.neutrals.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    signupButton: {
        backgroundColor: Colors.neutrals.offWhite,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary.forestGreen,
    },
    signupButtonText: {
        color: Colors.primary.forestGreen,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
