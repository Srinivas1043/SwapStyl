import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

// Ensure environment variables are loaded
// In Expo, use EXPO_PUBLIC_ prefix for client-side variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Key not found. Please check your .env file or environment configuration.');
}

// ── Client Configuration ──────────────────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // We handle deep links manually in React Native
    },
});

// ── Deep Linking Handling ─────────────────────────────────────────────────────
// Helper to parse URL fragment for tokens
function parseUrlFragment(url: string) {
    try {
        // Handle both hash (#) and query (?) params just in case
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        
        let paramsString = '';
        if (hashIndex !== -1) {
            paramsString = url.substring(hashIndex + 1);
        } else if (queryIndex !== -1) {
            paramsString = url.substring(queryIndex + 1);
        } else {
            return null;
        }

        const params = new URLSearchParams(paramsString);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type'); // recovery, signup, etc.

        if (accessToken && refreshToken) {
            return { accessToken, refreshToken, type };
        }
        return null;
    } catch (e) {
        console.error('Error parsing URL fragment:', e);
        return null;
    }
}

// Handler function
const handleDeepLink = async (url: string | null) => {
    if (!url) return;
    
    console.log('Incoming Deep Link:', url);

    // Parse tokens
    const tokens = parseUrlFragment(url);
    if (!tokens) return;

    const { accessToken, refreshToken, type } = tokens;

    // Set the session using the tokens
    const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    if (error) {
        console.error('Error setting session from deep link:', error);
    } else {
        console.log('Session restored from deep link. Type:', type);
        
        // Navigate based on type
        if (type === 'recovery') {
            // Check if we can navigate - might need a navigation ref or retry
            // For now, let the UI components handle the redirect based on session state
            // But usually we want to explicit push to reset-password screen
            // The listener in _layout.tsx usually handles auth state changes
        }
    }
};

// Listen for incoming links
Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

// Handle initial link if app was closed
Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
});


// ── App State Handling ────────────────────────────────────────────────────────
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
