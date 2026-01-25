// Authentication Context - Manages user authentication state

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/src/services/api";
import { storage } from "@/src/utils/storage";
import type { User, LoginCredentials, SignupData } from "@/src/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Initialize auth state from storage
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        storage.getToken(),
        storage.getUser(),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.login(credentials);

      await storage.setToken(response.token);
      await storage.setUser(response.user);

      setToken(response.token);
      setUser(response.user);
      setIsGuest(false);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || "Login failed",
      );
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const response = await api.signup(data);

      await storage.setToken(response.token);
      await storage.setUser(response.user);

      setToken(response.token);
      setUser(response.user);
      setIsGuest(false);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || "Signup failed",
      );
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      await storage.clearAll();
      setToken(null);
      setUser(null);
      setIsGuest(false);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser({ id: "guest", name: "Guest", email: "" } as User);
  };

  const updateUser = async (updatedUser: User) => {
    await storage.setUser(updatedUser);
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isGuest,
    login,
    signup,
    logout,
    updateUser,
    continueAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
