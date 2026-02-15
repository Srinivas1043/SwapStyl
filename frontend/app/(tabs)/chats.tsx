import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function ChatsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Chats & Deals</Text>
            <Text>Your conversations and swap progress.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neutrals.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 20,
        color: Colors.secondary.deepMaroon,
        fontWeight: 'bold',
    },
});
