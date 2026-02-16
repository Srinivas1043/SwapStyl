import Constants from 'expo-constants';
import { supabase } from './supabase';

const getBackendUrl = () => {
    // In dev, use the machine's IP from Expo config to work on physical devices/emulators
    const hostUri = Constants.expoConfig?.hostUri;
    const host = hostUri ? hostUri.split(':')[0] : 'localhost';
    
    // Default backend port is 8000
    // Use http because we don't have SSL in dev usually
    return `http://${host}:8000`;
};

export const API_URL = getBackendUrl();

export const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        throw new Error('No active session');
    }

    const headers: any = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorBody}`);
    }

    return response.json();
};
