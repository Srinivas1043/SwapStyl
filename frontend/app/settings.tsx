import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useState } from 'react';

export default function SettingsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState(true);
    const [matchAlerts, setMatchAlerts] = useState(true);
    const [promotions, setPromotions] = useState(false);

    const sections = [
        {
            title: 'Notifications',
            items: [
                { label: 'Push Notifications', toggle: true, value: notifications, onToggle: setNotifications },
                { label: 'Match Alerts', toggle: true, value: matchAlerts, onToggle: setMatchAlerts },
                { label: 'Promotions & News', toggle: true, value: promotions, onToggle: setPromotions },
            ],
        },
        {
            title: 'About',
            items: [
                { label: 'Version', value: '1.0.0 (Phase 1)', toggle: false },
                { label: 'Privacy Policy', arrow: true, toggle: false, onPress: () => Alert.alert('Privacy Policy', 'Available at swapstyl.com/privacy') },
                { label: 'Terms of Service', arrow: true, toggle: false, onPress: () => Alert.alert('Terms of Service', 'Available at swapstyl.com/terms') },
                { label: 'Contact Support', arrow: true, toggle: false, onPress: () => Alert.alert('Contact', 'Email us at support@swapstyl.com') },
            ],
        },
        {
            title: '🌿 Sustainability',
            items: [
                { label: 'Eco Points', value: 'Earn 10 pts per swap', toggle: false },
                { label: 'Carbon Saved', value: 'Track via your swaps', toggle: false },
                { label: 'Mission', arrow: true, toggle: false, onPress: () => Alert.alert('Our Mission', 'SwapStyl helps reduce fashion waste by connecting people who want to swap clothes — giving every garment a second life.') },
            ],
        },
    ];

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <Text style={s.title}>Settings</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
                {sections.map(section => (
                    <View key={section.title} style={s.section}>
                        <Text style={s.sectionTitle}>{section.title}</Text>
                        <View style={s.card}>
                            {section.items.map((item: any, i) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[s.row, i < section.items.length - 1 && s.rowBorder]}
                                    activeOpacity={item.onPress ? 0.7 : 1}
                                    onPress={item.onPress}
                                >
                                    <Text style={s.rowLabel}>{item.label}</Text>
                                    {item.toggle ? (
                                        <Switch
                                            value={item.value}
                                            onValueChange={item.onToggle}
                                            trackColor={{ false: '#DDD', true: Colors.primary.forestGreen }}
                                            thumbColor="#fff"
                                        />
                                    ) : item.arrow ? (
                                        <Ionicons name="chevron-forward" size={18} color="#BBB" />
                                    ) : (
                                        <Text style={s.rowValue}>{item.value}</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#EDEDEA',
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    container: { padding: 16, gap: 8 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
    card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
    rowLabel: { fontSize: 15, color: Colors.secondary.deepMaroon, fontWeight: '500' },
    rowValue: { fontSize: 13, color: '#888' },
});
