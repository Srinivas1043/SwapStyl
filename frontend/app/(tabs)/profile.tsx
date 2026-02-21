import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { authenticatedFetch } from '../../lib/api';

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    async function loadProfile() {
        try {
            const data = await authenticatedFetch('/profiles/me');
            setProfile(data);
        } catch (error) {
            console.log("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    }

    async function signOut() {
        await supabase.auth.signOut();
        router.replace('/');
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary.forestGreen} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                        style={styles.avatar}
                    />
                </View>
                <Text style={styles.name}>{profile?.full_name || 'No Name'}</Text>
                <Text style={styles.username}>@{profile?.username || 'username'}</Text>
                <Text style={styles.bio}>{profile?.bio || 'No bio yet'}</Text>
                <Text style={styles.location}>{profile?.location || 'Unknown Location'}</Text>
            </View>

            <View style={styles.wardrobe}>
                <Text style={styles.sectionTitle}>My Wardrobe</Text>
                <Text style={styles.placeholderText}>No items yet</Text>
            </View>

            <Pressable style={styles.logoutButton} onPress={signOut}>
                <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutrals.beige,
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.neutrals.beige,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        marginBottom: 15,
        shadowColor: Colors.primary.forestGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: Colors.secondary.pista,
    },
    name: {
        fontSize: 24,
        color: Colors.secondary.deepMaroon,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    username: {
        fontSize: 16,
        color: Colors.primary.forestGreen,
        marginBottom: 5,
    },
    bio: {
        fontSize: 14,
        color: Colors.neutrals.gray, // Assuming you have gray, or use deepMaroon with opacity
        textAlign: 'center',
        marginHorizontal: 20,
        marginBottom: 5,
    },
    location: {
        fontSize: 14,
        color: Colors.neutrals.gray,
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 18,
        color: Colors.primary.forestGreen,
        alignSelf: 'flex-start',
        marginBottom: 10,
        fontWeight: '600',
    },
    wardrobe: {
        flex: 1,
        backgroundColor: Colors.neutrals.white,
        borderRadius: 15,
        padding: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 2,
    },
    placeholderText: {
        color: Colors.neutrals.gray,
        textAlign: 'center',
        marginTop: 20,
    },
    logoutButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: Colors.secondary.deepMaroon,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: Colors.secondary.deepMaroon,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    logoutText: {
        color: Colors.neutrals.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
