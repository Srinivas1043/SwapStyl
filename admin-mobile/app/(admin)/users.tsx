import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import Colors from "../../constants/Colors";
import { useAdmin } from "../../context/AdminContext";

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
  suspended_at: string | null;
  suspension_reason: string | null;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "suspended">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<"suspend" | "unsuspend">("suspend");
  const [reason, setReason] = useState("");
  const { apiCall } = useAdmin();

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const url = filter === "suspended" ? "/admin/users?suspended_only=true" : "/admin/users";
      const resp = await apiCall("GET", url);
      setUsers(resp.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async () => {
    if (!selectedUser) return;
    try {
      if (action === "suspend") {
        await apiCall("POST", `/admin/users/${selectedUser.id}/suspend`, {
          reason: reason || "No reason provided",
        });
      } else {
        await apiCall("POST", `/admin/users/${selectedUser.id}/unsuspend`);
      }
      Alert.alert("Success", `User ${action}ed`);
      setShowModal(false);
      setReason("");
      loadUsers();
    } catch (err) {
      Alert.alert("Error", `Failed to ${action} user`);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <Image
        source={{ uri: item.avatar_url }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.suspended_at && (
          <Text style={styles.suspendedTag}>🔒 Suspended</Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.actionBtn,
          item.suspended_at ? styles.unsuspendBtn : styles.suspendBtn,
        ]}
        onPress={() => {
          setSelectedUser(item);
          setAction(item.suspended_at ? "unsuspend" : "suspend");
          setShowModal(true);
        }}
      >
        <Text style={styles.actionBtnText}>
          {item.suspended_at ? "Restore" : "Suspend"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && users.length === 0) {
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
          style={[styles.filterBtn, filter === "all" && styles.filterActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterActiveText]}>
            All Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === "suspended" && styles.filterActive]}
          onPress={() => setFilter("suspended")}
        >
          <Text style={[styles.filterText, filter === "suspended" && styles.filterActiveText]}>
            Suspended
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {action === "suspend" ? "Suspend User" : "Restore User"}
            </Text>
            {selectedUser && (
              <>
                <View style={styles.userPreview}>
                  <Image source={{ uri: selectedUser.avatar_url }} style={styles.previewAvatar} />
                  <Text style={styles.previewName}>{selectedUser.full_name}</Text>
                </View>
                {action === "suspend" && (
                  <TextInput
                    style={styles.input}
                    placeholder="Suspension reason"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                  />
                )}
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowModal(false);
                  setReason("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, action === "suspend" && styles.suspendConfirmBtn]}
                onPress={handleUserAction}
              >
                <Text style={styles.confirmBtnText}>
                  {action === "suspend" ? "Suspend" : "Restore"}
                </Text>
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
  userCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  suspendedTag: {
    fontSize: 11,
    color: "#FF1744",
    fontWeight: "600",
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  suspendBtn: {
    backgroundColor: "#FF1744",
  },
  unsuspendBtn: {
    backgroundColor: "#4CAF50",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
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
  userPreview: {
    alignItems: "center",
    marginBottom: 16,
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
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
  suspendConfirmBtn: {
    backgroundColor: "#FF1744",
  },
  confirmBtnText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
