import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../../lib/api';
import * as Location from 'expo-location';

const STEPS = [
    {
        id: 'profile_details',
        title: "Let's get to know you!",
        subtitle: "Your profile helps others trust you.",
        type: 'form',
        icon: 'person-circle-outline',
        fields: [
            { label: 'Full Name *', key: 'full_name', placeholder: 'e.g. Jane Doe', icon: 'person-outline' },
            { label: 'Username', key: 'username', placeholder: 'e.g. janedoe123', icon: 'at-outline' },
            { label: 'Bio', key: 'bio', placeholder: 'Tell us a bit about your style...', multiline: true, icon: 'create-outline' },
            { label: 'Location', key: 'location', placeholder: 'e.g. Amsterdam, Netherlands', icon: 'location-outline' },
            { label: 'Phone (optional)', key: 'phone', placeholder: 'e.g. +1 234 567 8900', icon: 'call-outline', keyboardType: 'phone-pad' },
        ]
    },
    {
        id: 'goal',
        title: "What are you here for?",
        subtitle: "Select all that apply.",
        type: 'selection',
        field: "goal",
        icon: 'heart-outline',
        options: [
            { label: "Swap Clothes", icon: "repeat-outline" },
            { label: "Sell Clothes", icon: "cash-outline" },
            { label: "Discover Styles", icon: "compass-outline" },
            { label: "Build Wardrobe", icon: "shirt-outline" },
            { label: "Just Browsing", icon: "eye-outline" }
        ],
        multi: true
    },
    {
        id: 'style',
        title: "Your Style Preference",
        subtitle: "Help us curate your feed.",
        type: 'selection',
        field: "style",
        icon: 'color-palette-outline',
        options: [
            { label: "Streetwear", icon: "bicycle-outline" },
            { label: "Minimal", icon: "remove-outline" },
            { label: "Vintage", icon: "time-outline" },
            { label: "Casual", icon: "cafe-outline" },
            { label: "Ethnic", icon: "globe-outline" },
            { label: "Sporty", icon: "football-outline" },
            { label: "Formal", icon: "briefcase-outline" }
        ],
        multi: true
    },
    {
        id: 'gender',
        title: "Your Gender Identity",
        subtitle: "For sizing and fit recommendations.",
        type: 'selection',
        field: "gender",
        icon: 'people-outline',
        options: [
            { label: "Men", icon: "man-outline" },
            { label: "Women", icon: "woman-outline" },
            { label: "Unisex", icon: "male-female-outline" },
            { label: "Prefer Not To Say", icon: "happy-outline" }
        ],
        multi: false
    },
    {
        id: 'swapping_category',
        title: "What will you swap?",
        subtitle: "Select categories you are interested in.",
        type: 'selection',
        field: "swapping_category",
        icon: 'pricetag-outline',
        options: [
            { label: "Tops", icon: "shirt-outline" },
            { label: "Bottoms", icon: "keypad-outline" },
            { label: "Shoes", icon: "footsteps-outline" },
            { label: "Accessories", icon: "watch-outline" },
            { label: "Bags", icon: "briefcase-outline" },
            { label: "Outerwear", icon: "snow-outline" }
        ],
        multi: true
    }
];

export default function PreferencesScreen() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    const [profileData, setProfileData] = useState<any>({});
    const [preferences, setPreferences] = useState<any>({});

    const stepData = STEPS[currentStep];

    const updateProfileField = (key: string, value: string) => {
        setProfileData((prev: any) => ({ ...prev, [key]: value }));
    };

    // ── Auto-detect location via GPS ────────────────────────────────────────
    const detectLocation = async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Location permission is needed to auto-fill your city. You can still type it manually.'
                );
                setLocationLoading(false);
                return;
            }

            const coords = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const [place] = await Location.reverseGeocodeAsync({
                latitude: coords.coords.latitude,
                longitude: coords.coords.longitude,
            });

            if (place) {
                // Build a human-readable "City, Country" string
                const parts = [place.city, place.region, place.country].filter(Boolean);
                const locationStr = parts.join(', ');
                updateProfileField('location', locationStr);
            } else {
                Alert.alert('Could not determine location', 'Please enter it manually.');
            }
        } catch (e: any) {
            Alert.alert('Location Error', e.message || 'Unable to fetch location.');
        } finally {
            setLocationLoading(false);
        }
    };

    const toggleOption = (optionLabel: string) => {
        const field = stepData.field!;
        const currentValues = preferences[field] || (stepData.multi ? [] : null);

        if (stepData.multi) {
            if (currentValues.includes(optionLabel)) {
                setPreferences({ ...preferences, [field]: currentValues.filter((v: string) => v !== optionLabel) });
            } else {
                setPreferences({ ...preferences, [field]: [...currentValues, optionLabel] });
            }
        } else {
            setPreferences({ ...preferences, [field]: optionLabel });
        }
    };

    const handleNext = async () => {
        if (currentStep === 0 && !profileData.full_name?.trim()) {
            Alert.alert('Required', 'Please enter your full name to continue.');
            return;
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert("Error", "No user found");
                setLoading(false);
                return;
            }

            const updatePayload = {
                full_name: profileData.full_name?.trim() || null,
                username: profileData.username?.trim() || null,
                bio: profileData.bio?.trim() || null,
                location: profileData.location?.trim() || null,
                phone: profileData.phone?.trim() || null,
                gender: preferences.gender || null,
                preferences: preferences,
                onboarding_completed_at: new Date().toISOString(),
            };

            try {
                await authenticatedFetch('/profiles/me', {
                    method: 'PUT',
                    body: JSON.stringify(updatePayload)
                });
                setLoading(false);
                router.replace('/(tabs)');
            } catch (error: any) {
                setLoading(false);
                Alert.alert("Error saving profile", error.message);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    const renderProgressBar = () => {
        const progress = ((currentStep + 1) / STEPS.length) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
        );
    };

    // ── Form step: scrollable, location field has GPS button ─────────────────
    const renderFormStep = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContainer}
        >
            {stepData.fields?.map((field: any) => {
                const isLocation = field.key === 'location';
                return (
                    <View key={field.key} style={styles.inputGroup}>
                        <Text style={styles.label}>{field.label}</Text>
                        <View style={[styles.inputWrapper, field.multiline && styles.inputWrapperMulti]}>
                            <Ionicons
                                name={field.icon}
                                size={20}
                                color={Colors.neutrals.gray}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={[styles.input, field.multiline && styles.textArea]}
                                placeholder={isLocation ? 'e.g. Amsterdam, Netherlands' : field.placeholder}
                                placeholderTextColor={Colors.neutrals.gray}
                                value={profileData[field.key] || ''}
                                onChangeText={(text) => updateProfileField(field.key, text)}
                                multiline={field.multiline}
                                numberOfLines={field.multiline ? 3 : 1}
                                keyboardType={field.keyboardType || 'default'}
                                autoCapitalize={field.key === 'username' ? 'none' : 'sentences'}
                            />
                            {/* GPS detect button only on location field */}
                            {isLocation && (
                                <TouchableOpacity
                                    onPress={detectLocation}
                                    style={styles.gpsButton}
                                    disabled={locationLoading}
                                >
                                    {locationLoading
                                        ? <ActivityIndicator size="small" color={Colors.primary.forestGreen} />
                                        : <Ionicons name="navigate" size={20} color={Colors.primary.forestGreen} />
                                    }
                                </TouchableOpacity>
                            )}
                        </View>
                        {isLocation && (
                            <Text style={styles.fieldHint}>
                                Tap 📍 to detect automatically, or type your city manually.
                            </Text>
                        )}
                    </View>
                );
            })}
            {/* Bottom padding so last field isn't hidden behind the footer */}
            <View style={{ height: 20 }} />
        </ScrollView>
    );

    const renderSelectionStep = () => (
        <ScrollView
            contentContainerStyle={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
        >
            {stepData.options?.map((option: any) => {
                const field = stepData.field!;
                const isSelected = stepData.multi
                    ? preferences[field]?.includes(option.label)
                    : preferences[field] === option.label;

                return (
                    <Pressable
                        key={option.label}
                        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                        onPress={() => toggleOption(option.label)}
                    >
                        <Ionicons
                            name={option.icon}
                            size={24}
                            color={isSelected ? Colors.primary.forestGreen : Colors.secondary.deepMaroon}
                        />
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                            {option.label}
                        </Text>
                        {isSelected && (
                            <View style={styles.checkIcon}>
                                <Ionicons name="checkmark-circle" size={20} color={Colors.primary.forestGreen} />
                            </View>
                        )}
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    return (
        // KeyboardAvoidingView wraps everything — footer stays visible above keyboard
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
            {/* ── Top header (back + progress + step count) ── */}
            <View style={styles.header}>
                {currentStep > 0 ? (
                    <Pressable onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                    </Pressable>
                ) : <View style={{ width: 34 }} />}

                {renderProgressBar()}

                <Text style={styles.stepIndicator}>{currentStep + 1}/{STEPS.length}</Text>
            </View>

            {/* ── Step title ── */}
            <View style={styles.titleContainer}>
                <View style={styles.iconCircle}>
                    <Ionicons name={stepData.icon as any} size={30} color={Colors.primary.forestGreen} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{stepData.title}</Text>
                    <Text style={styles.subtitle}>{stepData.subtitle}</Text>
                </View>
            </View>

            {/* ── Scrollable content area ── */}
            <View style={styles.content} key={currentStep}>
                {stepData.type === 'form' ? renderFormStep() : renderSelectionStep()}
            </View>

            {/* ── Fixed footer — always above keyboard ── */}
            <View style={styles.footer}>
                <Pressable
                    style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    disabled={loading}
                >
                    <Text style={styles.nextButtonText}>
                        {loading ? 'Saving...' : (currentStep === STEPS.length - 1 ? 'Finish Profile' : 'Continue')}
                    </Text>
                    {!loading && <Ionicons name="arrow-forward" size={20} color={Colors.neutrals.white} />}
                </Pressable>

                <Pressable onPress={() => router.replace('/(tabs)')} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutrals.beige,
        padding: 20,
        paddingTop: 60,
    },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
        width: 34,
    },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.primary.forestGreen,
        borderRadius: 3,
    },
    stepIndicator: {
        color: Colors.neutrals.gray,
        fontSize: 12,
        fontWeight: 'bold',
        width: 34,
        textAlign: 'right',
    },

    // ── Title ───────────────────────────────────────────────────────────────
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 2,
    },
    iconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: Colors.neutrals.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        flexShrink: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.secondary.deepMaroon,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.neutrals.gray,
        marginTop: 3,
    },

    // ── Scrollable content ───────────────────────────────────────────────────
    content: {
        flex: 1,
    },

    // ── Form step ───────────────────────────────────────────────────────────
    formContainer: {
        gap: 16,
        paddingBottom: 8,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.secondary.deepMaroon,
        marginLeft: 2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.neutrals.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 14,
        height: 50,
    },
    inputWrapperMulti: {
        height: 90,
        alignItems: 'flex-start',
        paddingTop: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: Colors.secondary.deepMaroon,
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top',
    },
    gpsButton: {
        padding: 6,
        marginLeft: 4,
    },
    fieldHint: {
        fontSize: 11,
        color: Colors.neutrals.gray,
        marginLeft: 4,
        marginTop: 2,
    },

    // ── Selection step ──────────────────────────────────────────────────────
    optionsContainer: {
        gap: 12,
        paddingBottom: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.neutrals.white,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    optionCardSelected: {
        borderColor: Colors.primary.forestGreen,
        backgroundColor: Colors.neutrals.betterBeige,
        shadowColor: Colors.primary.forestGreen,
        shadowOpacity: 0.1,
    },
    optionText: {
        fontSize: 15,
        color: Colors.secondary.deepMaroon,
        marginLeft: 14,
        flex: 1,
    },
    optionTextSelected: {
        fontWeight: '600',
        color: Colors.primary.forestGreen,
    },
    checkIcon: {
        marginLeft: 'auto',
    },

    // ── Footer ──────────────────────────────────────────────────────────────
    footer: {
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 4 : 8,
        gap: 10,
    },
    nextButton: {
        backgroundColor: Colors.primary.forestGreen,
        paddingVertical: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: Colors.primary.forestGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonDisabled: {
        backgroundColor: Colors.neutrals.gray,
        shadowOpacity: 0,
        elevation: 0,
    },
    nextButtonText: {
        color: Colors.neutrals.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipButton: {
        padding: 10,
        alignItems: 'center',
    },
    skipText: {
        color: Colors.neutrals.gray,
        fontSize: 14,
        fontWeight: '500',
    },
});
