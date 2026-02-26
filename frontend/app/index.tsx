import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '../constants/Colors';
import i18n from '../lib/i18n';

export default function Welcome() {
    const FEATURES = [
        { icon: '🔄', text: i18n.t('feature1') },
        { icon: '🌿', text: i18n.t('feature2') },
        { icon: '🤖', text: i18n.t('feature3') },
    ];

    return (
        <View style={styles.container}>
            {/* Hero */}
            <View style={styles.hero}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{i18n.t('sustainFashion')}</Text>
                </View>
                <Text style={styles.logoText}>SwapStyl</Text>
                <Text style={styles.tagline}>
                    {i18n.t('tagline')}
                </Text>
            </View>

            {/* Feature highlights */}
            <View style={styles.features}>
                {FEATURES.map(f => (
                    <View key={f.text} style={styles.featureRow}>
                        <Text style={styles.featureIcon}>{f.icon}</Text>
                        <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                ))}
            </View>

            {/* CTA */}
            <View style={styles.buttonContainer}>
                <Link href="/(auth)/signup" asChild>
                    <Pressable style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>{i18n.t('getStarted') || 'Get Started'}</Text>
                    </Pressable>
                </Link>

                <Link href="/(auth)/login" asChild>
                    <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>{i18n.t('haveAccount') || 'Log In'}</Text>
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
        paddingHorizontal: 28,
        paddingTop: 80,
        paddingBottom: 52,
    },
    hero: {
        alignItems: 'center',
        gap: 12,
    },
    badge: {
        backgroundColor: Colors.secondary.pista,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 4,
    },
    badgeText: {
        fontSize: 13,
        color: Colors.primary.forestGreen,
        fontWeight: '600',
    },
    logoText: {
        fontSize: 52,
        fontWeight: '800',
        color: Colors.primary.forestGreen,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 17,
        color: Colors.secondary.deepMaroon,
        textAlign: 'center',
        lineHeight: 26,
        fontWeight: '500',
    },
    features: {
        gap: 16,
        paddingHorizontal: 8,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    featureIcon: { fontSize: 22 },
    featureText: {
        fontSize: 15,
        color: Colors.secondary.deepMaroon,
        fontWeight: '500',
        flexShrink: 1,
    },
    buttonContainer: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: Colors.primary.forestGreen,
        padding: 17,
        borderRadius: 14,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.primary.forestGreen,
    },
    secondaryButtonText: {
        color: Colors.primary.forestGreen,
        fontSize: 15,
        fontWeight: '600',
    },
});
