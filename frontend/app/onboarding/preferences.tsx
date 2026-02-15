import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const STEPS = [
    {
        id: 'profile_details',
        title: "Let's get to know you!",
        subtitle: "Your profile helps others trust you.",
        type: 'form',
        icon: 'person-circle-outline',
        fields: [
            { label: 'Full Name', key: 'full_name', placeholder: 'e.g. Jane Doe', icon: 'person-outline' },
            { label: 'Username', key: 'username', placeholder: 'e.g. janedoe123', icon: 'at-outline' },
            { label: 'Bio', key: 'bio', placeholder: 'Tell us a bit about your style...', multiline: true, icon: 'create-outline' },
            { label: 'Location', key: 'location', placeholder: 'e.g. New York, NY', icon: 'location-outline' },
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
            { label: "Bottoms", icon: "keypad-outline" }, // generic placeholder
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

    const [profileData, setProfileData] = useState<any>({});
    const [preferences, setPreferences] = useState<any>({});

    const stepData = STEPS[currentStep];

    const updateProfileField = (key: string, value: string) => {
        setProfileData({ ...profileData, [key]: value });
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
                full_name: profileData.full_name,
                username: profileData.username,
                bio: profileData.bio,
                location: profileData.location,
                preferences: preferences
            };

            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', user.id);

            setLoading(false);
            if (error) {
                Alert.alert("Error saving profile", error.message);
            } else {
                router.replace('/(tabs)');
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const renderProgressBar = () => {
        const progress = ((currentStep + 1) / STEPS.length) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
        );
    };

    const renderFormStep = () => (
        <View style={styles.formContainer}>
            {stepData.fields?.map((field: any) => (
                <View key={field.key} style={styles.inputGroup}>
                    <Text style={styles.label}>{field.label}</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name={field.icon} size={20} color={Colors.neutrals.gray} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, field.multiline && styles.textArea]}
                            placeholder={field.placeholder}
                            placeholderTextColor={Colors.neutrals.gray}
                            value={profileData[field.key] || ''}
                            onChangeText={(text) => updateProfileField(field.key, text)}
                            multiline={field.multiline}
                            numberOfLines={field.multiline ? 3 : 1}
                        />
                    </View>
                </View>
            ))}
        </View>
    );

    const renderSelectionStep = () => (
        <ScrollView contentContainerStyle={styles.optionsContainer} showsVerticalScrollIndicator={false}>
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
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.header}>
                {currentStep > 0 ? (
                    <Pressable onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={Colors.secondary.deepMaroon} />
                    </Pressable>
                ) : <View style={{ width: 24 }} />}

                {renderProgressBar()}

                <Text style={styles.stepIndicator}>{currentStep + 1}/{STEPS.length}</Text>
            </View>

            <View
                key={currentStep}
                style={styles.content}
            >
                <View style={styles.titleContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={stepData.icon as any} size={32} color={Colors.primary.forestGreen} />
                    </View>
                    <View>
                        <Text style={styles.title}>{stepData.title}</Text>
                        <Text style={styles.subtitle}>{stepData.subtitle}</Text>
                    </View>
                </View>

                {stepData.type === 'form' ? renderFormStep() : renderSelectionStep()}
            </View>

            <View style={styles.footer}>
                <Pressable style={styles.nextButton} onPress={handleNext} disabled={loading}>
                    <Text style={styles.nextButtonText}>
                        {loading ? "Saving..." : (currentStep === STEPS.length - 1 ? "Finish Profile" : "Continue")}
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
        backgroundColor: Colors.neutrals.beige, // Changed to Beige for premium feel
        padding: 20,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginHorizontal: 15,
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
    },
    content: {
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 5,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.neutrals.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.secondary.deepMaroon,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.neutrals.gray,
        marginTop: 4,
    },
    formContainer: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary.deepMaroon,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.neutrals.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 15,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.secondary.deepMaroon,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 15,
    },
    optionsContainer: {
        gap: 12,
        paddingBottom: 20,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.neutrals.white,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    optionCardSelected: {
        borderColor: Colors.primary.forestGreen,
        backgroundColor: Colors.neutrals.betterBeige, // Using Better Beige for selected state
        shadowColor: Colors.primary.forestGreen,
        shadowOpacity: 0.1,
    },
    optionText: {
        fontSize: 16,
        color: Colors.secondary.deepMaroon,
        marginLeft: 15,
        flex: 1,
    },
    optionTextSelected: {
        fontWeight: '600',
        color: Colors.primary.forestGreen,
    },
    checkIcon: {
        marginLeft: 'auto',
    },
    footer: {
        marginTop: 10,
        gap: 15,
        marginBottom: 10,
    },
    nextButton: {
        backgroundColor: Colors.primary.forestGreen,
        paddingVertical: 16,
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
    nextButtonText: {
        color: Colors.neutrals.white,
        fontSize: 18,
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
