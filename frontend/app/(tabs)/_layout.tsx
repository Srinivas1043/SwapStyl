import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../lib/i18n';
import { useLanguage } from '../../context/LanguageContext';

export default function TabLayout() {
    const { locale } = useLanguage();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary.forestGreen,
                tabBarInactiveTintColor: Colors.secondary.deepMaroon,
                tabBarStyle: {
                    backgroundColor: Colors.neutrals.beige,
                    borderTopWidth: 0,
                    elevation: 5,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: i18n.t('home') || 'Swaps',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="swap-horizontal" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="upload"
                options={{
                    title: i18n.t('upload') || 'Upload',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add-circle" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="chats"
                options={{
                    title: i18n.t('chat') || 'Chats',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubbles" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: i18n.t('profile') || 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
