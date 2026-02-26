import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Colors from "../../constants/Colors";
import { useAdmin } from "../../context/AdminContext";

interface ModerationLog {
  id: string;
  moderator_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
}

export default function LogsScreen() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { apiCall } = useAdmin();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      // Fetch from a moderation logs endpoint if available
      // For now, we'll show a placeholder
      // const resp = await apiCall("GET", "/admin/logs");
      // setLogs(resp.logs || []);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: ModerationLog }) => {
    const actionIcon = {
      approve: "✅",
      reject: "❌",
      delete: "🗑️",
      user_suspended: "🔒",
      flag_resolved: "🚩",
    }[item.action_type] || "📝";

    return (
      <View style={styles.logCard}>
        <Text style={styles.logIcon}>{actionIcon}</Text>
        <View style={styles.logInfo}>
          <Text style={styles.logAction}>{item.action_type.replace(/_/g, " ").toUpperCase()}</Text>
          <Text style={styles.logDetails}>
            {item.target_type}: {item.target_id.substring(0, 8)}...
          </Text>
          {item.reason && (
            <Text style={styles.logReason}>{item.reason}</Text>
          )}
          <Text style={styles.logTime}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {logs.length === 0 ? (
        <ScrollView contentContainerStyle={styles.empty}>
          <Text style={styles.emptyText}>No logs yet</Text>
          <Text style={styles.emptySubtext}>All moderation actions will appear here</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  logCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  logIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  logReason: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 4,
  },
  logTime: {
    fontSize: 11,
    color: "#BBB",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
});
