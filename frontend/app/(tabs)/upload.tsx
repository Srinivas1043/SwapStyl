import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, Pressable, Image,
    ScrollView, Alert, ActivityIndicator, TouchableOpacity,
    Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { authenticatedFetch } from '../../lib/api';
import { useRouter } from 'expo-router';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = ['Tops', 'Bottoms', 'Shoes', 'Dresses', 'Outerwear', 'Bags', 'Accessories'];
const GENDER_OPTIONS = ['Men', 'Women', 'Unisex'];
const CONDITION_OPTIONS = ['New with tags', 'New without tags', 'Good', 'Fair', 'Poor'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '28', '30', '32', '34', '36', '38', '40', '42'];

// Photo slot definitions: first 3 are required, rest optional
const PHOTO_SLOTS = [
    { label: 'Front View', icon: 'shirt-outline', required: true },
    { label: 'Brand Tag', icon: 'pricetag-outline', required: true },
    { label: 'Side / Back', icon: 'sync-outline', required: true },
    { label: 'Extra 1', icon: 'add-circle-outline', required: false },
    { label: 'Extra 2', icon: 'add-circle-outline', required: false },
    { label: 'Extra 3', icon: 'add-circle-outline', required: false },
];

// ─── Chip Selector ────────────────────────────────────────────────────────────
function ChipSelector({ options, value, onSelect }: {
    options: string[]; value: string; onSelect: (v: string) => void;
}) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    style={[st.chip, value === opt && st.chipActive]}
                    onPress={() => onSelect(value === opt ? '' : opt)}
                    activeOpacity={0.7}
                >
                    <Text style={[st.chipText, value === opt && st.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

// ─── Upload Screen ────────────────────────────────────────────────────────────
export default function UploadScreen() {
    const router = useRouter();

    // Photos — array of local URIs (null = empty slot)
    const [photos, setPhotos] = useState<(string | null)[]>(Array(PHOTO_SLOTS.length).fill(null));
    const [loadingImages, setLoadingImages] = useState<boolean[]>(Array(PHOTO_SLOTS.length).fill(false));

    // Form fields
    const [title, setTitle] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [gender, setGender] = useState('');
    const [condition, setCondition] = useState('');
    const [color, setColor] = useState('');
    const [size, setSize] = useState('');
    const [description, setDescription] = useState('');

    // State
    const [step, setStep] = useState<'idle' | 'uploading' | 'verifying' | 'submitting'>('idle');
    const [statusMsg, setStatusMsg] = useState('');

    const filledCount = photos.filter(Boolean).length;
    const requiredFilled = photos.slice(0, 3).every(Boolean);

    // ─── Pick image for a slot ──────────────────────────────────────────────
    const pickPhoto = async (index: number) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            console.log(`Image selected at index ${index}:`, uri);
            console.log(`Asset details:`, result.assets[0]);
            
            if (!uri) {
                console.error('No URI in asset!');
                return;
            }
            
            const newPhotos = [...photos];
            newPhotos[index] = uri;
            setPhotos(newPhotos);

            const newLoading = [...loadingImages];
            newLoading[index] = true;
            setLoadingImages(newLoading);
            
            console.log(`Updated photos:`, newPhotos[index]);
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = [...photos];
        newPhotos[index] = null;
        setPhotos(newPhotos);
        
        const newLoading = [...loadingImages];
        newLoading[index] = false;
        setLoadingImages(newLoading);
    };

    // ─── Upload image to Supabase Storage ──────────────────────────────────
    const uploadImageToStorage = async (uri: string, index: number): Promise<string> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const ext = (uri.split('.').pop() || 'jpg').split('?')[0];
        const fileName = `${user.id}/${Date.now()}_${index}.${ext}`;
        const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        // Use response.arrayBuffer() directly — React Native Blob.arrayBuffer() is not implemented
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error } = await supabase.storage
            .from('item-images')
            .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });

        if (error) throw new Error(error.message);

        const { data } = supabase.storage.from('item-images').getPublicUrl(fileName);
        return data.publicUrl;
    };

    // ─── Validate & Submit ──────────────────────────────────────────────────
    const handlePublish = async () => {
        // Validation
        if (!requiredFilled) {
            Alert.alert('Photos required', 'Please add at least 3 photos:\n1. Front view\n2. Brand tag\n3. Side or back view.');
            return;
        }
        if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }
        if (!brand.trim()) { Alert.alert('Required', 'Please enter the brand name.'); return; }
        if (!category) { Alert.alert('Required', 'Please select a category.'); return; }
        if (!condition) { Alert.alert('Required', 'Please select the condition.'); return; }

        try {
            // STEP 1: Upload all photos to Supabase Storage
            setStep('uploading');
            setStatusMsg('Uploading photos…');

            const filledPhotos = photos.filter(Boolean) as string[];
            const publicUrls: string[] = [];

            for (let i = 0; i < filledPhotos.length; i++) {
                setStatusMsg(`Uploading photo ${i + 1} of ${filledPhotos.length}…`);
                const url = await uploadImageToStorage(filledPhotos[i], i);
                publicUrls.push(url);
            }

            // STEP 2: AI Verification (using brand-tag photo = index 1 if available)
            setStep('verifying');
            setStatusMsg('Verifying with AI…');

            let aiScore = 0;
            let aiVerified = false;
            let aiReason = '';

            try {
                const verifyRes = await authenticatedFetch('/verify/item', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        brand: brand.trim(), 
                        category: category || null, 
                        image_urls: publicUrls 
                    }),
                });
                aiScore = verifyRes.ai_score ?? 0;
                aiVerified = verifyRes.verified ?? false;
                aiReason = verifyRes.reason ?? '';
            } catch (e: any) {
                // AI failure is non-blocking — treat as pending_review
                console.warn('AI verify failed:', e.message);
                aiScore = 0;
            }

            // STEP 3: Create the item
            setStep('submitting');
            setStatusMsg('Publishing your item…');

            const result = await authenticatedFetch('/items', {
                method: 'POST',
                body: JSON.stringify({
                    title: title.trim(),
                    brand: brand.trim(),
                    category,
                    gender: gender || null,
                    condition,
                    color: color.trim() || null,
                    size: size || null,
                    description: description.trim() || null,
                    images: publicUrls,
                    ai_score: aiScore,
                }),
            });

            setStep('idle');

            // Show result alert
            if (aiVerified) {
                Alert.alert(
                    '✅ Item Listed!',
                    `Your item is live in the swap feed.\n\nAI Confidence: ${aiScore}%\n${aiReason}`,
                    [{ text: 'View Profile', onPress: () => router.replace('/(tabs)/profile') }]
                );
            } else {
                Alert.alert(
                    '⏳ Under Review',
                    `Your item has been submitted for manual review. We'll notify you once it's approved.\n\nAI Confidence: ${aiScore}%\n${aiReason || 'Low brand confidence — manual check required.'}`,
                    [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }]
                );
            }

            // Reset form
            setPhotos(Array(PHOTO_SLOTS.length).fill(null));
            setTitle(''); setBrand(''); setCategory(''); setGender('');
            setCondition(''); setColor(''); setSize('');
            setDescription('');

        } catch (err: any) {
            setStep('idle');
            Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
        }
    };

    const isBusy = step !== 'idle';

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={st.container} keyboardShouldPersistTaps="handled">

                    {/* Header */}
                    <Text style={st.header}>New Listing</Text>
                    <Text style={st.subheader}>Show off your wardrobe</Text>

                    {/* Photo Grid */}
                    <View style={st.photoSection}>
                        <View style={st.photoGrid}>
                            {PHOTO_SLOTS.map((slot, i) => (
                                <View key={`photo-${i}-${photos[i]}`} style={st.photoSlotWrapper}>
                                    {photos[i] ? (
                                        <TouchableOpacity style={st.photoSlot} onPress={() => pickPhoto(i)} activeOpacity={0.9}>
                                            <Image 
                                                key={`image-${i}-${photos[i]}`}
                                                source={{ uri: photos[i] }} 
                                                style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} 
                                                resizeMode="cover"
                                                onLoadStart={() => {
                                                    console.log(`Image ${i} loading started`);
                                                }}
                                                onLoad={() => {
                                                    console.log(`Image ${i} loaded successfully`);
                                                }}
                                                onLoadEnd={() => {
                                                    console.log(`Image ${i} load ended`);
                                                    setLoadingImages(prev => {
                                                        const fresh = [...prev];
                                                        fresh[i] = false;
                                                        return fresh;
                                                    });
                                                }}
                                                onError={(error) => {
                                                    console.error(`Image ${i} failed to load:`, error);
                                                    setLoadingImages(prev => {
                                                        const fresh = [...prev];
                                                        fresh[i] = false;
                                                        return fresh;
                                                    });
                                                }}
                                            />
                                            {loadingImages[i] && (
                                                <View style={[StyleSheet.absoluteFill, st.loadingOverlay]}>
                                                    <ActivityIndicator size="small" color={Colors.primary.forestGreen} />
                                                </View>
                                            )}
                                            {!loadingImages[i] && photos[i] && (
                                                <TouchableOpacity style={st.photoRemove} onPress={() => removePhoto(i)} hitSlop={8}>
                                                    <Ionicons name="close-circle" size={24} color="#fff" />
                                                </TouchableOpacity>
                                            )}
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={[st.photoSlot, st.photoSlotEmpty]} onPress={() => pickPhoto(i)} activeOpacity={0.7}>
                                            <Ionicons name={slot.icon as any} size={22} color={slot.required ? Colors.secondary.deepMaroon : Colors.neutrals.gray} />
                                            <Text style={[st.slotLabel, !slot.required && st.slotLabelOptional]}>{slot.label}</Text>
                                            {slot.required && <View style={st.reqDot} />}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                        <Text style={st.photoCount}>{filledCount}/6 photos{filledCount < 3 ? ' — 3 required' : ''}</Text>
                    </View>

                    {/* Form */}
                    <View style={st.form}>

                        {/* Title */}
                        <Text style={st.label}>Title *</Text>
                        <TextInput style={st.input} value={title} onChangeText={setTitle}
                            placeholder="e.g. Beige Linen Shirt" placeholderTextColor={Colors.neutrals.gray} />

                        {/* Brand */}
                        <Text style={st.label}>Brand *</Text>
                        <TextInput style={st.input} value={brand} onChangeText={setBrand}
                            placeholder="e.g. H&M, Zara, Levi's" placeholderTextColor={Colors.neutrals.gray} />

                        {/* Category */}
                        <Text style={st.label}>Category *</Text>
                        <ChipSelector options={CATEGORY_OPTIONS} value={category} onSelect={setCategory} />

                        {/* Gender */}
                        <Text style={[st.label, { marginTop: 16 }]}>Gender</Text>
                        <ChipSelector options={GENDER_OPTIONS} value={gender} onSelect={setGender} />

                        {/* Condition */}
                        <Text style={[st.label, { marginTop: 16 }]}>Condition *</Text>
                        <ChipSelector options={CONDITION_OPTIONS} value={condition} onSelect={setCondition} />

                        {/* Size */}
                        <Text style={[st.label, { marginTop: 16 }]}>Size</Text>
                        <ChipSelector options={SIZE_OPTIONS} value={size} onSelect={setSize} />

                        {/* Color */}
                        <Text style={[st.label, { marginTop: 16 }]}>Colour</Text>
                        <TextInput style={st.input} value={color} onChangeText={setColor}
                            placeholder="e.g. Black, White, Beige" placeholderTextColor={Colors.neutrals.gray} />

                        {/* Description */}
                        <Text style={st.label}>Description</Text>
                        <TextInput
                            style={[st.input, st.inputMultiline]}
                            value={description} onChangeText={setDescription}
                            placeholder="Tell buyers about this item — fabric, fit, any flaws…"
                            placeholderTextColor={Colors.neutrals.gray}
                            multiline numberOfLines={4} textAlignVertical="top"
                        />

                        {/* AI Notice */}
                        <View style={st.aiNotice}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary.forestGreen} />
                            <Text style={st.aiNoticeText}>
                                Your brand tag photo will be verified by AI. Items with high confidence are listed instantly; others go through a quick manual review.
                            </Text>
                        </View>

                        {/* Publish Button */}
                        <Pressable style={[st.publishBtn, isBusy && st.publishDisabled]} onPress={handlePublish} disabled={isBusy}>
                            {isBusy ? (
                                <View style={st.publishLoading}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={st.publishText}>{statusMsg}</Text>
                                </View>
                            ) : (
                                <Text style={st.publishText}>Publish Item</Text>
                            )}
                        </Pressable>

                        <View style={{ height: 32 }} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

    header: { fontSize: 24, fontWeight: '800', color: Colors.secondary.deepMaroon, textAlign: 'center', marginBottom: 2 },
    subheader: { fontSize: 14, color: Colors.neutrals.gray, textAlign: 'center', marginBottom: 20 },

    // Photos
    photoSection: { marginBottom: 24 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    photoSlotWrapper: { width: '30%' },
    photoSlot: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    photoSlotEmpty: { backgroundColor: '#EEEAE4', borderWidth: 1.5, borderColor: '#DDD8D0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
    slotLabel: { fontSize: 10, fontWeight: '600', color: Colors.secondary.deepMaroon, textAlign: 'center' },
    slotLabelOptional: { color: Colors.neutrals.gray },
    reqDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary.forestGreen, position: 'absolute', top: 6, right: 6 },
    photoRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12 },
    photoCount: { textAlign: 'center', marginTop: 10, fontSize: 13, color: Colors.neutrals.gray, fontWeight: '500' },

    // Form
    form: {},
    label: { fontSize: 13, fontWeight: '700', color: Colors.secondary.deepMaroon, marginBottom: 8 },
    input: {
        borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
        backgroundColor: '#fff', fontSize: 15, color: Colors.secondary.deepMaroon,
    },
    inputMultiline: { height: 100, paddingTop: 12 },

    // Chip selector
    chipRow: { gap: 8, paddingBottom: 4, flexDirection: 'row' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EEEAE4', borderWidth: 1.5, borderColor: '#E0DDD8' },
    chipActive: { backgroundColor: Colors.primary.forestGreen, borderColor: Colors.primary.forestGreen },
    chipText: { fontSize: 13, color: Colors.secondary.deepMaroon, fontWeight: '500' },
    chipTextActive: { color: '#fff', fontWeight: '700' },

    // AI notice
    aiNotice: { flexDirection: 'row', gap: 10, backgroundColor: '#EEF8F0', borderRadius: 12, padding: 14, marginBottom: 20, marginTop: 8, alignItems: 'flex-start' },
    aiNoticeText: { flex: 1, fontSize: 13, color: Colors.secondary.deepMaroon, lineHeight: 20 },

    // Publish
    publishBtn: { backgroundColor: Colors.primary.forestGreen, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    publishDisabled: { opacity: 0.7 },
    publishLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    publishText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    loadingOverlay: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        zIndex: 10,
    },
});
