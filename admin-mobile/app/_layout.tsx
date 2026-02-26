import { Stack } from "expo-router";
import AdminAuthGuard from "./context/AdminAuthGuard";
import { AdminProvider } from "./context/AdminContext";

export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminAuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AdminAuthGuard>
    </AdminProvider>
  );
}
