import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import Colors from "@/constants/Colors";
import { useAdmin } from "@/context/AdminContext";

interface DashboardStats {
  pending_reviews: number;
  open_reports: number;
  suspended_users: number;
  total_items: number;
  total_users: number;
}

export default function AdminDash() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { apiCall } = useAdmin();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await apiCall("GET", "/admin/dashboard");
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Failed to load dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Overview</Text>
      </View>

      <View style={styles.grid}>
        <StatCard title="Pending Reviews" value={stats.pending_reviews} color="#FF6B35" />
        <StatCard title="Open Reports" value={stats.open_reports} color="#FF1744" />
        <StatCard title="Suspended Users" value={stats.suspended_users} color="#F57C00" />
        <StatCard title="Total Items" value={stats.total_items} color="#2196F3" />
        <StatCard title="Total Users" value={stats.total_users} color="#4CAF50" />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Last updated: {new Date().toLocaleTimeString()}</Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 5 }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  grid: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "700",
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
  error: {
    fontSize: 16,
    color: "#FF1744",
    textAlign: "center",
  },
});
