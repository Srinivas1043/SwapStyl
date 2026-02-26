import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

export default function AdminTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarStyle: { backgroundColor: Colors.background, borderTopColor: Colors.border },
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />,
          headerTitle: "Admin Dashboard",
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarLabel: "Products",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="package-box" color={color} size={size} />,
          headerTitle: "Product Review",
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarLabel: "Reports",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="flag" color={color} size={size} />,
          headerTitle: "User Reports",
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarLabel: "Users",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-multiple" color={color} size={size} />,
          headerTitle: "User Management",
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: "Logs",
          tabBarLabel: "Logs",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" color={color} size={size} />,
          headerTitle: "Moderation Logs",
        }}
      />
    </Tabs>
  );
}
