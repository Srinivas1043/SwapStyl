import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authenticatedFetch } from '../../lib/api';

export default function LeaveReviewScreen() {
    const { id, reviewee_id, item_title } = useLocalSearchParams();
    const router = useRouter();

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function submitReview() {
        if (rating < 1 || rating > 5) return;
        setSubmitting(true);
        try {
            await authenticatedFetch('/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    reviewee_id: reviewee_id as string,
                    conversation_id: id as string,
                    rating,
                    comment: comment.trim() || undefined
                })
            });
            Alert.alert('Success', 'Thank you for leaving a review! +100 Points if you gave 5 stars ⭐', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            if (e.message?.includes('violates unique constraint') || e.message?.includes('already exist')) {
                Alert.alert('Notice', 'You have already left a review for this swap.');
                router.back();
            } else {
                Alert.alert('Error', e.message || 'Failed to submit review');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={s.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Ionicons name="close" size={28} color={Colors.secondary.deepMaroon} />
                    </TouchableOpacity>
                    <Text style={s.title}>Leave a Review</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={s.content}>
                    <Text style={s.prompt}>How was your swap for "{item_title}"?</Text>
                    <Text style={s.subPrompt}>Your feedback helps keep the community safe and trustworthy.</Text>

                    <View style={s.starsRow}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={48}
                                    color={star <= rating ? "#F1C40F" : "#DDD"}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={s.ratingLabel}>
                        {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great' : rating === 3 ? 'Okay' : rating === 2 ? 'Disappointing' : 'Terrible'}
                    </Text>

                    <View style={s.inputWrapper}>
                        <TextInput
                            style={s.input}
                            placeholder="Write a completely honest review (optional)"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            value={comment}
                            onChangeText={setComment}
                            maxLength={500}
                        />
                    </View>

                    <TouchableOpacity
                        style={[s.submitBtn, submitting && s.submitDisabled]}
                        onPress={submitReview}
                        disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Submit Review</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F5F0' },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700', color: Colors.secondary.deepMaroon },
    content: { flex: 1, padding: 24, alignItems: 'center' },
    prompt: { fontSize: 20, fontWeight: '700', color: Colors.secondary.deepMaroon, textAlign: 'center', marginBottom: 8 },
    subPrompt: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
    starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    ratingLabel: { fontSize: 16, fontWeight: '600', color: Colors.secondary.deepMaroon, marginBottom: 40 },
    inputWrapper: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
        marginBottom: 32,
    },
    input: {
        fontSize: 16, color: '#333',
        height: 120, textAlignVertical: 'top'
    },
    submitBtn: {
        backgroundColor: Colors.secondary.deepMaroon,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    submitDisabled: { opacity: 0.6 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
