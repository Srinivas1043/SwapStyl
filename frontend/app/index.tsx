import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function Welcome() {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) checkProfileAndRedirect(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) checkProfileAndRedirect(session);
        });
    }, []);

    async function checkProfileAndRedirect(session: Session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', session.user.id)
            .single();

        if (profile?.preferences && Object.keys(profile.preferences).length > 0) {
            router.replace('/(tabs)');
        } else {
            router.replace('/onboarding/preferences');
        }
    }

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
