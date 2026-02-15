import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { verifyItemWithAI } from '../../services/ai';
import { useRouter } from 'expo-router';

export default function UploadScreen() {
    const router = useRouter();
    const [image, setImage] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [brand, setBrand] = useState('');
    const [type, setType] = useState('');
    const [condition, setCondition] = useState('');
    const [color, setColor] = useState('');
    const [size, setSize] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleUpload = async () => {
        if (!image || !title || !brand) {
            Alert.alert("Please fill all required fields and upload an image.");
            return;
        }

        setVerifying(true);
        // 1. AI Verification
        const aiResult: any = await verifyItemWithAI(image, { brand, title });
        setVerifying(false);

        if (!aiResult.verified) {
            Alert.alert("AI Verification Failed", "Manual review required.");
            // Proceed or stop based on logic. For now, we proceed with warning.
        } else {
            Alert.alert("AI Verified", aiResult.message);
        }

        setLoading(true);
        // 2. Upload Image to Supabase Storage (Stub - skipping real upload for now, just using local URI)
        // In real app: upload to bucket, get URL.
        const imageUrl = image;

        // 3. Insert into DB
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('items')
            .insert({
                owner_id: user.id,
                title,
                brand,
                category: type,
                condition,
                color,
                size,
                images: [imageUrl],
                ai_verified: aiResult.verified
            });

        setLoading(false);

        if (error) {
            Alert.alert("Upload Failed", error.message);
        } else {
            Alert.alert("Success", "Item added to your wardrobe!");
            router.replace('/(tabs)/profile');
            // Reset form
            setImage(null);
            setTitle('');
            setBrand('');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>New Listing</Text>

            <Pressable style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.image} />
                ) : (
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>+ Add Photos</Text>
                    </View>
                )}
            </Pressable>

            <View style={styles.form}>
                <TextInput placeholder="Title" style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={Colors.neutrals.gray} />
                <TextInput placeholder="Brand" style={styles.input} value={brand} onChangeText={setBrand} placeholderTextColor={Colors.neutrals.gray} />
                <TextInput placeholder="Product Type" style={styles.input} value={type} onChangeText={setType} placeholderTextColor={Colors.neutrals.gray} />
                <TextInput placeholder="Condition" style={styles.input} value={condition} onChangeText={setCondition} placeholderTextColor={Colors.neutrals.gray} />
                <TextInput placeholder="Color" style={styles.input} value={color} onChangeText={setColor} placeholderTextColor={Colors.neutrals.gray} />
                <TextInput placeholder="Size" style={styles.input} value={size} onChangeText={setSize} placeholderTextColor={Colors.neutrals.gray} />

                <Pressable
                    style={[styles.publishButton, (loading || verifying) && styles.disabled]}
                    onPress={handleUpload}
                    disabled={loading || verifying}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <Text style={styles.publishText}>{verifying ? "Verifying..." : "Publish"}</Text>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: Colors.neutrals.white,
        flexGrow: 1,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary.deepMaroon,
        textAlign: 'center',
        marginBottom: 20,
    },
    imagePicker: {
        alignSelf: 'center',
        width: 200,
        height: 200,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: Colors.neutrals.betterBeige,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        alignItems: 'center',
    },
    placeholderText: {
        color: Colors.secondary.deepMaroon,
        fontWeight: 'bold',
    },
    form: {
        width: '100%',
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.neutrals.gray,
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        color: Colors.neutrals.black,
    },
    publishButton: {
        backgroundColor: Colors.primary.forestGreen,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    disabled: {
        opacity: 0.7,
    },
    publishText: {
        color: Colors.neutrals.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
