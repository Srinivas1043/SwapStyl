import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
    const router = useRouter();

    async function signOut() {
        await supabase.auth.signOut();
        router.replace('/');
    }

    return (
        <View style={styles.container}>
            <Text style={styles.text}>My Profile</Text>
            <Text>Username | Rating | Location</Text>

            <View style={styles.wardrobe}>
                <Text style={styles.sectionTitle}>My Wardrobe</Text>
                {/* Grid of items */}
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
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 24,
        color: Colors.secondary.deepMaroon,
        fontWeight: 'bold',
        marginVertical: 20,
    },
    sectionTitle: {
        fontSize: 18,
        color: Colors.primary.forestGreen,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    wardrobe: {
        width: '100%',
        flex: 1,
        backgroundColor: Colors.neutrals.white,
        borderRadius: 10,
        padding: 10,
    },
    logoutButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: Colors.secondary.deepMaroon,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    logoutText: {
        color: Colors.neutrals.white,
        fontWeight: 'bold',
    },
});
