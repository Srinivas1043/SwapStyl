import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [initialized, setInitialized] = useState(false);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setInitialized(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = segments[0] === '(auth)';
        console.log('Auth check:', { session: !!session, inAuthGroup, segment: segments[0] });

        if (session && inAuthGroup) {
            // User is signed in and trying to access auth screens -> redirect to home/tabs
            checkProfileAndRedirect(session);
        } else if (!session && !inAuthGroup && segments[0] !== 'index') {
            // User is not signed in and trying to access protected screens -> redirect to welcome
            // Allow access to index (welcome screen)
            router.replace('/');
        }
    }, [session, initialized, segments]);

    async function checkProfileAndRedirect(session: Session) {
        try {
            console.log('Checking profile for user:', session.user.id);
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Profile fetch error:', error);
                // Fallback to onboarding if error isn't "row not found" (just in case)
                // or maybe stay here? Let's go to onboarding to be safe for now.
            }

            if (profile?.preferences && Object.keys(profile.preferences).length > 0) {
                console.log('Profile found, going to tabs');
                router.replace('/(tabs)');
            } else {
                console.log('Profile not found/empty, going to onboarding');
                // If they just signed up, they might not have profile yet. 
                // Go to onboarding.
                router.replace('/onboarding/preferences');
            }
        } catch (e) {
            console.error('Unexpected error in checkProfile:', e);
            router.replace('/onboarding/preferences');
        }
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="index" />
            </Stack>
            <StatusBar style="dark" />
        </GestureHandlerRootView>
    );
}
