/**
 * SehatAI API Service
 * Real backend integration.
 * Handles: JWT auth with refresh, guest predictions, profile, history, reports.
 */

import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, API_ENDPOINTS, SECURE_KEYS } from '../utils/constants';
import type {
  AuthTokens,
  LoginCredentials,
  RegisterRequest,
  User,
  ProfileUpdate,
  PredictionResponse,
  ScanHistoryResponse,
  DiseaseModel,
} from '../types';

// ─── Axios Instance ───────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Token refresh concurrency guard
let isRefreshing = false;
let refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];
let onAuthFailure: (() => Promise<void> | void) | null = null;

export const setAuthFailureHandler = (handler: (() => Promise<void> | void) | null) => {
  onAuthFailure = handler;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { detail?: string; message?: string }
      | string
      | undefined;

    if (typeof responseData === 'string' && responseData.trim().length > 0) {
      return responseData;
    }

    if (responseData && typeof responseData === 'object') {
      if (typeof responseData.detail === 'string' && responseData.detail.trim().length > 0) {
        return responseData.detail;
      }
      if (typeof responseData.message === 'string' && responseData.message.trim().length > 0) {
        return responseData.message;
      }
    }

    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function subscribeTokenRefresh(resolve: (token: string) => void, reject: (error: unknown) => void) {
  refreshSubscribers.push({ resolve, reject });
}

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(sub => sub.resolve(newToken));
  refreshSubscribers = [];
}

function onTokenRefreshFailed(error: unknown) {
  refreshSubscribers.forEach(sub => sub.reject(error));
  refreshSubscribers = [];
}

// ─── Request Interceptor — attach access token ────────────────────────────────

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor — silent token refresh on 401 ──────────────────────

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken: string) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
            }
            resolve(apiClient(originalRequest));
          }, reject);
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post<AuthTokens>(
          `${API_CONFIG.BASE_URL}${API_ENDPOINTS.REFRESH}`,
          { refresh_token: refreshToken }
        );

        await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, data.access_token);
        await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, data.refresh_token);

        onTokenRefreshed(data.access_token);
        isRefreshing = false;

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${data.access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onTokenRefreshFailed(refreshError);
        await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN);

        if (onAuthFailure) {
          try {
            await onAuthFailure();
          } catch {
            // Ignore callback errors to preserve original rejection.
          }
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>(API_ENDPOINTS.LOGIN, credentials);
    return data;
  },

  async register(payload: RegisterRequest): Promise<AuthTokens> {
    // Register first (backend returns user info, not tokens)
    await apiClient.post(API_ENDPOINTS.REGISTER, payload);
    // Then login to obtain tokens
    return authApi.login({ email: payload.email, password: payload.password });
  },
};

// ─── Profile API ──────────────────────────────────────────────────────────────

export const profileApi = {
  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<User>(API_ENDPOINTS.PROFILE);
    return data;
  },

  async updateProfile(updates: ProfileUpdate): Promise<User> {
    const { data } = await apiClient.put<User>(API_ENDPOINTS.UPDATE_PROFILE, updates);
    return data;
  },
};

// ─── Prediction API ───────────────────────────────────────────────────────────

export const predictionApi = {
  /**
   * Upload an X-ray image and run prediction for the given model.
   * Auth is optional on the backend:
   *   - Token in store → result saved to DB, scan_id returned
   *   - No token (guest) → prediction runs, scan_id is null
   */
  async predict(imageUri: string, model: DiseaseModel): Promise<PredictionResponse> {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'xray.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    try {
      const { data } = await apiClient.post<PredictionResponse>(
        `${API_ENDPOINTS.PREDICT}?model=${model}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return data;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error, 'Prediction failed. Please try again.'));
    }
  },

  async predictBoth(imageUri: string): Promise<{ tb: PredictionResponse; pneumonia: PredictionResponse }> {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'xray.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    try {
      const { data } = await apiClient.post<{ tb: PredictionResponse; pneumonia: PredictionResponse }>(
        API_ENDPOINTS.PREDICT_BOTH,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return data;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error, 'Prediction failed. Please try again.'));
    }
  },
};

// ─── History API ──────────────────────────────────────────────────────────────

export const historyApi = {
  async getHistory(model?: DiseaseModel, limit = 100, offset = 0): Promise<ScanHistoryResponse> {
    const params: Record<string, unknown> = { limit, offset };
    if (model) params.model = model;
    const { data } = await apiClient.get<ScanHistoryResponse>(API_ENDPOINTS.HISTORY, { params });
    return data;
  },
};

// ─── Report API ───────────────────────────────────────────────────────────────

export const reportApi = {
  getReportUrl(scanId: number): string {
    return `${API_CONFIG.BASE_URL}/${API_ENDPOINTS.REPORT}${scanId}`;
  },

  async getAuthHeader(): Promise<string | null> {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
    return token ? `Bearer ${token}` : null;
  },
};

// ─── Convenience default export ───────────────────────────────────────────────

const api = {
  auth: authApi,
  profile: profileApi,
  prediction: predictionApi,
  history: historyApi,
  report: reportApi,
};

export default api;
