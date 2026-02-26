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
import Colors from "@/constants/Colors";
import { useAdmin } from "@/context/AdminContext";

interface PendingItem {
  id: string;
  title: string;
  images: string[];
  brand: string;
  size: string;
  owner: { id: string; full_name: string; avatar_url: string };
  created_at: string;
}

export default function ProductsScreen() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const { apiCall } = useAdmin();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const resp = await apiCall("GET", "/admin/items/pending?page=1&page_size=10");
      setItems(resp.items || []);
      setHasMore(resp.has_more);
      setPage(1);
    } catch (err) {
      console.error("Failed to load items:", err);
      Alert.alert("Error", "Failed to load pending items");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    try {
      setLoading(true);
      const nextPage = page + 1;
      const resp = await apiCall("GET", `/admin/items/pending?page=${nextPage}&page_size=10`);
      setItems([...items, ...(resp.items || [])]);
      setHasMore(resp.has_more);
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async () => {
    if (!selectedItem || !action) return;
    try {
      await apiCall("POST", `/admin/items/${selectedItem.id}/moderate`, {
        action,
        reason: reason || undefined,
      });
      Alert.alert("Success", `Item ${action}d`);
      setShowModal(false);
      setReason("");
      setAction(null);
      loadItems();
    } catch (err) {
      Alert.alert("Error", "Failed to moderate item");
    }
  };

  const renderItem = ({ item }: { item: PendingItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => {
        setSelectedItem(item);
        setShowModal(true);
      }}
    >
      <Image
        source={{ uri: item.images?.[0] }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemMeta}>{item.brand} • {item.size}</Text>
        <View style={styles.ownerInfo}>
          <Image
            source={{ uri: item.owner.avatar_url }}
            style={styles.avatar}
          />
          <Text style={styles.ownerName}>{item.owner.full_name}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={() => {
        setSelectedItem(item);
        setAction("approve");
        handleModerate();
      }}>
        <Text style={styles.actionBtnText}>✓</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => {
        setSelectedItem(item);
        setShowModal(true);
        setAction("reject");
      }}>
        <Text style={styles.rejectBtnText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending items</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {action === "reject" ? "Reject Item" : "Approve Item"}
            </Text>
            {action === "reject" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Rejection reason (required)"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowModal(false);
                  setReason("");
                  setAction(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, action === "reject" && styles.rejectConfirmBtn]}
                onPress={handleModerate}
                disabled={action === "reject" && !reason.trim()}
              >
                <Text style={styles.confirmBtnText}>
                  {action === "reject" ? "Reject" : "Approve"}
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
    padding: 12,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
  },
  itemInfo: {
    flex: 1,
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  ownerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  ownerName: {
    fontSize: 12,
    color: "#666",
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  rejectBtn: {
    backgroundColor: "#FF1744",
    marginRight: 12,
  },
  actionBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  rejectBtnText: {
    fontSize: 18,
    fontWeight: "700",
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
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  rejectConfirmBtn: {
    backgroundColor: "#FF1744",
  },
  confirmBtnText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
