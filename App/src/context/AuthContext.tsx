/**
 * Authentication Context
 * - Tokens stored in expo-secure-store (encrypted device keychain)
 * - User profile cached in memory; only re-fetched after explicit update
 * - Guest mode: no tokens, predictions work but nothing saved to DB
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, profileApi, setAuthFailureHandler } from '../services/api';
import { SECURE_KEYS, STORAGE_KEYS } from '../utils/constants';
import type { User, LoginCredentials, RegisterRequest, ProfileUpdate } from '../types';

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  /** Profile cached in memory — no API call unless invalidated */
  profile: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  /** Call after successful profile update to refresh the cache */
  refreshProfile: () => Promise<void>;
  /** Update profile and invalidate cache */
  updateProfile: (data: ProfileUpdate) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Ref prevents double-fetch during StrictMode double-effect
  const profileFetchedRef = useRef(false);

  // ── Boot: restore session from secure storage ────────────────────────────

  useEffect(() => {
    restoreSession();
  }, []);

  const clearSession = useCallback(async () => {
    const activeUserId = user?.id ?? profile?.id;
    await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.PROFILE_DATA,
      STORAGE_KEYS.CACHED_SCANS,
    ]);
    if (activeUserId !== undefined) {
      await AsyncStorage.removeItem(`@sehatai_avatar_${activeUserId}`);
    }
    setUser(null);
    setProfile(null);
    setIsGuest(true);
    profileFetchedRef.current = false;
  }, [profile?.id, user?.id]);

  useEffect(() => {
    setAuthFailureHandler(clearSession);
    return () => setAuthFailureHandler(null);
  }, [clearSession]);

  const restoreSession = async () => {
    try {
      const [accessToken, cachedUserRaw] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
      ]);

      if (!accessToken) {
        return;
      }

      if (cachedUserRaw) {
        const cachedUser: User = JSON.parse(cachedUserRaw);
        setUser(cachedUser);
      }

      const cachedProfileRaw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
      if (cachedProfileRaw) {
        setProfile(JSON.parse(cachedProfileRaw));
      }

      // Validate active session and refresh cache with backend source of truth.
      try {
        const p = await profileApi.getProfile();
        setProfile(p);
        setUser(p);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(p));
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(p));
        profileFetchedRef.current = true;
      } catch {
        await clearSession();
      }
    } catch (err) {
      console.warn('Session restore error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Profile fetch (called once after login and on explicit refresh) ───────

  const fetchAndCacheProfile = async () => {
    try {
      const p = await profileApi.getProfile();
      setProfile(p);
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(p));
      profileFetchedRef.current = true;
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
  };

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (credentials: LoginCredentials) => {
    try {
      const tokens = await authApi.login(credentials);
      await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, tokens.access_token);
      await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, tokens.refresh_token);

      // Fetch profile immediately after login
      const p = await profileApi.getProfile();
      setProfile(p);
      setUser(p);
      profileFetchedRef.current = true;

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(p));
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(p));
      setIsGuest(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      throw new Error(axiosErr.response?.data?.detail || axiosErr.message || 'Login failed');
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const tokens = await authApi.register(data);
      await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, tokens.access_token);
      await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, tokens.refresh_token);

      const p = await profileApi.getProfile();
      setProfile(p);
      setUser(p);
      profileFetchedRef.current = true;

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(p));
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(p));
      setIsGuest(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      throw new Error(axiosErr.response?.data?.detail || axiosErr.message || 'Registration failed');
    }
  };

  const logout = async () => {
    // Logout is client-side only (backend uses stateless JWT)
    await clearSession();
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    setProfile(null);
  };

  // ── Profile management ────────────────────────────────────────────────────

  const refreshProfile = async () => {
    profileFetchedRef.current = false;
    await fetchAndCacheProfile();
  };

  const updateProfile = async (data: ProfileUpdate): Promise<User> => {
    const updated = await profileApi.updateProfile(data);
    setProfile(updated);
    setUser(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updated));
    return updated;
  };

  // ── Context value ─────────────────────────────────────────────────────────

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !isGuest && user !== null,
    isGuest,
    profile,
    login,
    register,
    logout,
    continueAsGuest,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
