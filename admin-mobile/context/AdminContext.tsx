import React, { createContext, useContext, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://localhost:8000"; // Change to your backend URL

interface AdminContextType {
  token: string | null;
  isLoading: boolean;
  apiCall: (method: string, path: string, body?: any) => Promise<any>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const apiCall = useCallback(
    async (method: string, path: string, body?: any) => {
      try {
        const options: RequestInit = {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        };

        if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_URL}${path}`, options);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "API error");
        }

        return await response.json();
      } catch (err) {
        console.error("API Error:", err);
        throw err;
      }
    },
    [token]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        const resp = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!resp.ok) {
          throw new Error("Login failed");
        }

        const data = await resp.json();
        setToken(data.access_token);
        await SecureStore.setItemAsync("admin_token", data.access_token);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setToken(null);
    await SecureStore.deleteItemAsync("admin_token");
  }, []);

  return (
    <AdminContext.Provider value={{ token, isLoading, apiCall, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
