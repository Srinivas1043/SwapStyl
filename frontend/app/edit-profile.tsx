import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Image, Alert, ActivityIndicator, ScrollView,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { authenticatedFetch } from '../lib/api';
import * as Location from 'expo-location';

export default function EditProfileScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [locating, setLocating] = useState(false);

    const [avatar, setAvatar] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [phone, setPhone] = useState('');
    const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => { loadProfile(); }, []);

    async function loadProfile() {
        try {
            const data = await authenticatedFetch('/profiles/me');
            setAvatar(data.avatar_url || null);
            setFullName(data.full_name || '');
            setUsername(data.username || '');
            setBio(data.bio || '');
            setLocation(data.location || '');
            setPhone(data.phone || '');
            if (data.latitude && data.longitude) {
                setLatLng({ lat: data.latitude, lng: data.longitude });
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    async function useCurrentLocation() {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Please allow location access in your settings.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = pos.coords;
            setLatLng({ lat: latitude, lng: longitude });

            // Reverse geocode to city name
            const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
            const parts = [place?.city, place?.region, place?.country].filter(Boolean);
            const label = parts.join(', ') || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
            setLocation(label);
        } catch (e: any) {
            Alert.alert('Location error', e.message);
        } finally {
            setLocating(false);
        }
    }

    async function pickAndUploadAvatar() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });
        if (result.canceled || !result.assets[0]) return;

        const uri = result.assets[0].uri;
        setUploadingAvatar(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const ext = (uri.split('.').pop() || 'jpg').split('?')[0];
            const fileName = `${user.id}/avatar.${ext}`;
            const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();

            const { error } = await supabase.storage
                .from('item-images')
                .upload(`avatars/${fileName}`, arrayBuffer, { contentType: mimeType, upsert: true });

            if (error) throw new Error(error.message);

            const { data } = supabase.storage.from('item-images').getPublicUrl(`avatars/${fileName}`);
            setAvatar(data.publicUrl);
        } catch (e: any) {
            Alert.alert('Upload failed', e.message);
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleSave() {
        if (!fullName.trim()) {
            Alert.alert('Required', 'Please enter your full name.');
            return;
        }

        setSaving(true);
        try {
            await authenticatedFetch('/profiles/me', {
                method: 'PATCH',
                body: JSON.stringify({
                    full_name: fullName.trim(),
                    username: username.trim() || null,
                    bio: bio.trim() || null,
                    location: location.trim() || null,
                    phone: phone.trim() || null,
                    avatar_url: avatar || null,
                    ...(latLng ? { latitude: latLng.lat, longitude: latLng.lng } : {}),
                }),
            });
            Alert.alert('✅ Saved', 'Your profile has been updated.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}><ActivityIndicator size="large" color={Colors.primary.forestGreen} /></View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
                        {saving
                            ? <ActivityIndicator size="small" color={Colors.primary.forestGreen} />
                            : <Text style={s.saveBtnText}>Save</Text>
                        }
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
                    {/* Avatar */}
                    <View style={s.avatarSection}>
                        <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.85} style={s.avatarWrapper}>
                            {uploadingAvatar ? (
                                <View style={s.avatarLoading}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            ) : avatar ? (
                                <Image source={{ uri: avatar }} style={s.avatar} />
                            ) : (
                                <View style={s.avatarPlaceholder}>
                                    <Ionicons name="person" size={40} color="#BBB" />
                                </View>
                            )}
                            <View style={s.avatarEditBadge}>
                                <Ionicons name="camera" size={14} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={s.avatarHint}>Tap to change photo</Text>
                    </View>

                    {/* Fields */}
                    <View style={s.form}>
                        <Text style={s.label}>Full Name *</Text>
                        <TextInput style={s.input} value={fullName} onChangeText={setFullName}
                            placeholder="Your full name" placeholderTextColor={Colors.neutrals.gray} />

                        <Text style={s.label}>Username</Text>
                        <View style={s.usernameWrapper}>
                            <Text style={s.atSign}>@</Text>
                            <TextInput
                                style={[s.input, s.usernameInput]}
                                value={username} onChangeText={setUsername}
                                placeholder="username" placeholderTextColor={Colors.neutrals.gray}
                                autoCapitalize="none" autoCorrect={false}
                            />
                        </View>

                        <Text style={s.label}>Bio</Text>
                        <TextInput style={[s.input, s.inputMultiline]}
                            value={bio} onChangeText={setBio}
                            placeholder="Tell people about yourself…"
                            placeholderTextColor={Colors.neutrals.gray}
                            multiline numberOfLines={3} textAlignVertical="top" />

                        <Text style={s.label}>Location</Text>
                        <View style={s.locationRow}>
                            <TextInput
                                style={[s.input, { flex: 1 }]}
                                value={location}
                                onChangeText={v => { setLocation(v); setLatLng(null); }}
                                placeholder="e.g. Milan, Italy"
                                placeholderTextColor={Colors.neutrals.gray}
                            />
                            <TouchableOpacity
                                style={s.gpsBtn}
                                onPress={useCurrentLocation}
                                disabled={locating}
                            >
                                {locating
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Ionicons name="navigate" size={18} color="#fff" />
                                }
                            </TouchableOpacity>
                        </View>
                        {latLng && (
                            <Text style={s.gpsConfirm}>📍 GPS saved ({latLng.lat.toFixed(4)}, {latLng.lng.toFixed(4)})</Text>
                        )}

                        <Text style={s.label}>Phone</Text>
                        <TextInput style={s.input} value={phone} onChangeText={setPhone}
                            placeholder="+39 123 456 7890" placeholderTextColor={Colors.neutrals.gray}
                            keyboardType="phone-pad" />
                    </View>

                    <TouchableOpacity style={[s.saveFullBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={s.saveFullBtnText}>Save Changes</Text>
                        }
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    saveBtn: { paddingHorizontal: 4 },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary.forestGreen },

    container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

    // Avatar
    avatarSection: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
    avatarWrapper: { position: 'relative', width: 100, height: 100 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
    avatarPlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#EEEAE4', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#E0DDD8',
    },
    avatarLoading: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: Colors.primary.forestGreen, alignItems: 'center', justifyContent: 'center',
    },
    avatarEditBadge: {
        position: 'absolute', bottom: 2, right: 2,
        backgroundColor: Colors.secondary.deepMaroon, borderRadius: 14,
        width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    avatarHint: { marginTop: 8, fontSize: 12, color: Colors.neutrals.gray },

    // Form
    form: { gap: 2 },
    label: { fontSize: 13, fontWeight: '700', color: Colors.secondary.deepMaroon, marginBottom: 6, marginTop: 14 },
    input: {
        borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        backgroundColor: '#fff', fontSize: 15, color: Colors.secondary.deepMaroon,
    },
    inputMultiline: { height: 88, paddingTop: 12 },
    usernameWrapper: { flexDirection: 'row', alignItems: 'center' },
    atSign: { fontSize: 16, fontWeight: '600', color: Colors.neutrals.gray, marginRight: 2 },
    usernameInput: { flex: 1 },

    saveFullBtn: {
        backgroundColor: Colors.primary.forestGreen, paddingVertical: 16,
        borderRadius: 14, alignItems: 'center', marginTop: 28,
    },
    saveFullBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    // GPS location row
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    gpsBtn: {
        backgroundColor: Colors.primary.forestGreen, borderRadius: 12,
        width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    },
    gpsConfirm: { fontSize: 12, color: Colors.primary.forestGreen, marginTop: 4, fontWeight: '500' },
});
