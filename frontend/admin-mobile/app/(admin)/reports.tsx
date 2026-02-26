import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import Colors from "@/constants/Colors";
import { useAdmin } from "@/context/AdminContext";

interface Report {
  id: string;
  reported_type: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reporter: { id: string; full_name: string };
  item: { id: string; title: string } | null;
  user: { id: string; full_name: string } | null;
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open">("open");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState("");
  const { apiCall } = useAdmin();

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const url = filter === "open" ? "/admin/reports?status=open" : "/admin/reports";
      const resp = await apiCall("GET", url);
      setReports(resp.reports || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    try {
      await apiCall("PATCH", `/admin/reports/${selectedReport.id}`, {
        status: action ? "resolved" : "dismissed",
        action_taken: action || undefined,
      });
      Alert.alert("Success", "Report resolved");
      setShowModal(false);
      setAction("");
      loadReports();
    } catch (err) {
      Alert.alert("Error", "Failed to resolve report");
    }
  };

  const renderItem = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => {
        setSelectedReport(item);
        setShowModal(true);
      }}
    >
      <View style={styles.statusBadge}>
        <Text style={[styles.statusText, item.status === "open" && styles.openStatus]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.reportInfo}>
        <Text style={styles.reportType}>
          {item.reported_type === "item" ? "📦 Item Report" : "👤 User Report"}
        </Text>
        <Text style={styles.reportReason}>{item.reason}</Text>
        <Text style={styles.reportTarget}>
          {item.reported_type === "item"
            ? item.item?.title
            : `@${item.user?.full_name}`}
        </Text>
        <Text style={styles.reportMeta}>
          by {item.reporter.full_name} • {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && reports.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === "open" && styles.filterActive]}
          onPress={() => setFilter("open")}
        >
          <Text style={[styles.filterText, filter === "open" && styles.filterActiveText]}>
            Open ({reports.filter(r => r.status === "open").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === "all" && styles.filterActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterActiveText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No reports</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resolve Report</Text>
            {selectedReport && (
              <>
                <Text style={styles.modalLabel}>Report Details</Text>
                <View style={styles.detailBox}>
                  <Text style={styles.detailText}>Type: {selectedReport.reported_type}</Text>
                  <Text style={styles.detailText}>Reason: {selectedReport.reason}</Text>
                  {selectedReport.description && (
                    <Text style={styles.detailText}>Description: {selectedReport.description}</Text>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Action taken"
                  value={action}
                  onChangeText={setAction}
                  multiline
                />
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowModal(false);
                  setAction("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleResolve}
              >
                <Text style={styles.confirmBtnText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "#fff",
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  filterActive: {
    borderBottomColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  filterActiveText: {
    color: Colors.primary,
  },
  reportCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
  },
  statusBadge: {
    justifyContent: "center",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#999",
  },
  openStatus: {
    color: "#FF1744",
  },
  reportInfo: {
    flex: 1,
  },
  reportType: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  reportReason: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
  },
  reportTarget: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 4,
  },
  reportMeta: {
    fontSize: 11,
    color: "#999",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  detailBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  cancelBtnText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  confirmBtnText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
