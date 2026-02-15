import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const STEPS = [
    {
        title: "What are you here for?",
        field: "goal",
        options: ["Swap Clothes", "Sell Clothes", "Discover Styles", "Build your wardrobe", "Just Browsing"],
        multi: true
    },
    {
        title: "Your Style Preference",
        field: "style",
        options: ["Streetwear", "Minimal", "Vintage", "Casual", "Ethnic", "Sporty", "Formal"],
        multi: true
    },
    {
        title: "Your Gender Identity",
        field: "gender",
        options: ["Men", "Women", "Unisex", "Prefer Not To Say"],
        multi: false
    },
    {
        title: "What are you swapping?",
        field: "swapping_category",
        options: ["Tops", "Bottoms", "Shoes", "Accessories", "Bags", "Outerwear"],
        multi: true
    }
];

export default function PreferencesScreen() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [preferences, setPreferences] = useState<any>({});
    const [loading, setLoading] = useState(false);

    const stepData = STEPS[currentStep];

    const toggleOption = (option: string) => {
        const field = stepData.field;
        const currentValues = preferences[field] || (stepData.multi ? [] : null);

        if (stepData.multi) {
            if (currentValues.includes(option)) {
                setPreferences({ ...preferences, [field]: currentValues.filter((v: string) => v !== option) });
            } else {
                setPreferences({ ...preferences, [field]: [...currentValues, option] });
            }
        } else {
            setPreferences({ ...preferences, [field]: option });
        }
    };

    const handleNext = async () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Save and finish
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert("Error", "No user found");
                setLoading(false);
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .update({ preferences: preferences })
                .eq('id', user.id);

            setLoading(false);
            if (error) {
                Alert.alert("Error saving preferences", error.message);
            } else {
                router.replace('/(tabs)');
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.stepIndicator}>{currentStep + 1}/{STEPS.length}</Text>
            </View>

            <Text style={styles.title}>{stepData.title}</Text>

            <ScrollView contentContainerStyle={styles.optionsContainer}>
                {stepData.options.map((option) => {
                    const field = stepData.field;
                    const isSelected = stepData.multi
                        ? preferences[field]?.includes(option)
                        : preferences[field] === option;

                    return (
                        <Pressable
                            key={option}
                            style={[styles.optionButton, isSelected && styles.optionSelected]}
                            onPress={() => toggleOption(option)}
                        >
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable style={styles.nextButton} onPress={handleNext} disabled={loading}>
                    <Text style={styles.nextButtonText}>{loading ? "Saving..." : "Next"}</Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.skipText}>Skip For Now</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutrals.white,
        padding: 20,
        paddingTop: 50,
    },
    header: {
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    stepIndicator: {
        color: Colors.neutrals.gray,
        fontSize: 14,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary.deepMaroon,
        marginBottom: 30,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: Colors.neutrals.betterBeige,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: Colors.secondary.pista,
        borderColor: Colors.primary.forestGreen,
    },
    optionText: {
        color: Colors.secondary.deepMaroon,
        fontSize: 16,
    },
    optionTextSelected: {
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 'auto',
        gap: 15,
    },
    nextButton: {
        backgroundColor: Colors.primary.forestGreen,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    nextButtonText: {
        color: Colors.neutrals.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipText: {
        textAlign: 'center',
        color: Colors.primary.forestGreen,
        textDecorationLine: 'underline',
    },
});
