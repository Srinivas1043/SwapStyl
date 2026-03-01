import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useState, useEffect } from 'react';
import i18n from '../lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { authenticatedFetch } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState(true);
    const [matchAlerts, setMatchAlerts] = useState(true);
    const [promotions, setPromotions] = useState(false);
    const { locale, setLocale } = useLanguage();
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Delete Account',
            'Your account will be deactivated immediately. All your data will be permanently deleted after 14 days.\n\nYou can restore your account by logging in within the 14-day window.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete My Account',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Are you absolutely sure?',
                            'This will schedule your account for permanent deletion in 14 days. You can restore it within that period.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Yes, Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            setDeleting(true);
                                            await authenticatedFetch('/profiles/me', { method: 'DELETE' });
                                            await supabase.auth.signOut();
                                        } catch (e: any) {
                                            Alert.alert('Error', e?.message || 'Failed to delete account. Please try again.');
                                        } finally {
                                            setDeleting(false);
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const changeLanguage = () => {
        const options = ['English', 'Nederlands', 'Italiano', 'Cancel'];
        const values = ['en', 'nl', 'it'];

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: 3 },
                buttonIndex => {
                    if (buttonIndex < 3) applyLanguage(values[buttonIndex]);
                }
            );
        } else {
            Alert.alert(
                'Select Language',
                'Choose your preferred language',
                [
                    { text: 'English', onPress: () => applyLanguage('en') },
                    { text: 'Nederlands', onPress: () => applyLanguage('nl') },
                    { text: 'Italiano', onPress: () => applyLanguage('it') },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    const applyLanguage = (lang: string) => {
        setLocale(lang);
    };

    const getCurrentLanguageLabel = () => {
        switch(locale) {
            case 'en': return 'English';
            case 'nl': return 'Nederlands';
            case 'it': return 'Italiano';
            default: return 'English';
        }
    };

    const sections = [
        {
            title: i18n.t('settings'),
            items: [
                { 
                    label: i18n.t('language'), 
                    value: getCurrentLanguageLabel(),
                    toggle: false, 
                    arrow: true,
                    onPress: changeLanguage 
                },
            ],
        },
        {
            title: i18n.t('notifications'),
            items: [
                { label: 'Push Notifications', toggle: true, value: notifications, onToggle: setNotifications },
                { label: i18n.t('matchAlerts'), toggle: true, value: matchAlerts, onToggle: setMatchAlerts },
                { label: i18n.t('promotions'), toggle: true, value: promotions, onToggle: setPromotions },
            ],
        },
        {
            title: i18n.t('about'),
            items: [
                { label: i18n.t('version'), value: '1.0.0 (Phase 1)', toggle: false },
                { label: i18n.t('privacy'), arrow: true, toggle: false, onPress: () => Alert.alert('Privacy Policy', 'Available at swapstyl.com/privacy') },
                { label: i18n.t('terms'), arrow: true, toggle: false, onPress: () => Alert.alert('Terms of Service', 'Available at swapstyl.com/terms') },
                { label: i18n.t('contact'), arrow: true, toggle: false, onPress: () => Alert.alert('Contact', 'Email us at support@swapstyl.com') },
            ],
        },
        {
            title: `🌿 ${i18n.t('sustainability')}`,
            items: [
                { label: i18n.t('ecoPoints'), value: 'Earn 10 pts per swap', toggle: false },
                { label: i18n.t('carbonSaved'), value: 'Track via your swaps', toggle: false },
                { label: i18n.t('mission'), arrow: true, toggle: false, onPress: () => Alert.alert('Our Mission', 'SwapStyl helps reduce fashion waste by connecting people who want to swap clothes — giving every garment a second life.') },
            ],
        },
    ];

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                </TouchableOpacity>
                <Text style={s.title}>{i18n.t('settings')} </Text>
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

                {/* ── Danger Zone ── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Account</Text>
                    <View style={s.card}>
                        <TouchableOpacity
                            style={s.row}
                            activeOpacity={0.7}
                            onPress={handleDeleteAccount}
                            disabled={deleting}
                        >
                            <Ionicons name="trash-outline" size={18} color="#E74C3C" style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: '#E74C3C', flex: 1 }]}>Delete Account</Text>
                            <Ionicons name="chevron-forward" size={18} color="#E74C3C" />
                        </TouchableOpacity>
                    </View>
                </View>

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
