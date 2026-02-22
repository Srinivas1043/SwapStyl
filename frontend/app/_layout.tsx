import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';
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
        const inOnboarding = segments[0] === 'onboarding'; 
        const inIndex = segments[0] === 'index' || segments[0] === undefined;

        console.log('Auth check:', { session: !!session, segments, inAuthGroup, inIndex });

        if (!session && !inAuthGroup && !inIndex) {
            // No session and not on a public screen → back to welcome
            // Also explicitly close any open modals/stacks if needed
            router.replace('/(auth)/login');
        }
    }, [session, initialized, segments]);

    if (!initialized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.primary.forestGreen} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
            </Stack>
            <StatusBar style="dark" />
        </GestureHandlerRootView>
    );
}
