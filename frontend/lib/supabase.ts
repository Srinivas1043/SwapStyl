import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Setup deep linking handler for Supabase
const handleDeepLink = async (url: string | null) => {
    if (!url) return;

    try {
        // Extract access_token and refresh_token from URL fragment
        // Supabase sends them as #access_token=...&refresh_token=...
        if (url.includes('access_token') || url.includes('refresh_token')) {
            const hashIndex = url.indexOf('#');
            if (hashIndex !== -1) {
                const fragment = url.substring(hashIndex + 1);
                const params = new URLSearchParams(fragment);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                }
            }
        }
    } catch (e) {
        console.error('Deep link error:', e);
    }
};

// Listen for incoming links
Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

// Handle initial link if app was closed
Linking.getInitialURL().then(handleDeepLink);

AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
