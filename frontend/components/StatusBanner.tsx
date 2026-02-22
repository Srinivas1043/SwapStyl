import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

type BannerType = 'error' | 'info' | 'success';

interface Props {
    message: string | null;
    type?: BannerType;
    /** auto-dismiss after ms (0 = never) */
    autoDismiss?: number;
    onDismiss: () => void;
}

const CONFIG: Record<BannerType, { bg: string; border: string; text: string; icon: any }> = {
    error: {
        bg: '#FDF1F1',
        border: '#E8C4C4',
        text: Colors.secondary.deepMaroon,
        icon: 'alert-circle-outline',
    },
    info: {
        bg: '#F0F7F4',
        border: '#C4DDD4',
        text: Colors.primary.forestGreen,
        icon: 'information-circle-outline',
    },
    success: {
        bg: '#F0F7F4',
        border: Colors.primary.forestGreen,
        text: Colors.primary.forestGreen,
        icon: 'checkmark-circle-outline',
    },
};

/** Friendly message mapping — converts raw API/system errors into readable copy */
export function friendlyError(raw: string): string {
    const msg = raw?.toLowerCase() ?? '';
    if (msg.includes('no active session') || msg.includes('not authenticated') || msg.includes('401'))
        return 'Please sign in to continue.';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch'))
        return 'Check your connection and try again.';
    if (msg.includes('500') || msg.includes('internal server'))
        return 'Something went wrong on our end. Try again shortly.';
    if (msg.includes('404'))
        return 'This content could not be found.';
    if (msg.includes('403') || msg.includes('forbidden'))
        return 'You don\'t have permission to do that.';
    if (msg.includes('timeout'))
        return 'The request took too long. Try again.';
    // Return original if it's already short and readable
    if (raw && raw.length < 80 && !raw.startsWith('API Error')) return raw;
    return 'Something went wrong. Please try again.';
}

export default function StatusBanner({ message, type = 'error', autoDismiss = 4000, onDismiss }: Props) {
    const opacity = useRef(new Animated.Value(0)).current;
    const cfg = CONFIG[type];

    useEffect(() => {
        if (!message) {
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
            return;
        }
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        if (autoDismiss > 0) {
            const t = setTimeout(onDismiss, autoDismiss);
            return () => clearTimeout(t);
        }
    }, [message]);

    if (!message) return null;

    return (
        <Animated.View style={[styles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border, opacity }]}>
            <Ionicons name={cfg.icon} size={16} color={cfg.text} style={{ marginTop: 1 }} />
            <Text style={[styles.text, { color: cfg.text }]} numberOfLines={2}>{message}</Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={15} color={cfg.text} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 12,
        borderWidth: 1,
    },
    text: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
});
