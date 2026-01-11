// API Service Layer - Ready for real backend integration
// Currently uses mock API, switch to real API by setting USE_MOCK_API to false

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '@/src/utils/constants';
import { storage } from '@/src/utils/storage';
import { mockApi } from './mockApi';
import type {
  AuthResponse,
  LoginCredentials,
  SignupData,
  User,
  Scan,
  PredictionResult,
  Notification,
} from '@/src/types';

// Toggle this to switch between mock and real API
const USE_MOCK_API = true;

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await storage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await storage.clearAll();
          // Redirect to login will be handled by AuthContext
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication APIs
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (USE_MOCK_API) {
      return mockApi.login(credentials);
    }

    const response = await this.client.post<AuthResponse>(
      API_ENDPOINTS.LOGIN,
      credentials
    );
    return response.data;
  }

  async signup(data: SignupData): Promise<AuthResponse> {
    if (USE_MOCK_API) {
      return mockApi.signup(data);
    }

    const response = await this.client.post<AuthResponse>(
      API_ENDPOINTS.SIGNUP,
      data
    );
    return response.data;
  }

  async logout(): Promise<void> {
    if (USE_MOCK_API) {
      return mockApi.logout();
    }

    await this.client.post(API_ENDPOINTS.LOGOUT);
  }

  // Prediction APIs
  async uploadAndPredict(imageUri: string): Promise<PredictionResult> {
    if (USE_MOCK_API) {
      return mockApi.predict(imageUri);
    }

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'xray.jpg',
    } as any);

    const response = await this.client.post<PredictionResult>(
      API_ENDPOINTS.PREDICT,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  // History APIs
  async getHistory(): Promise<Scan[]> {
    if (USE_MOCK_API) {
      const user = await storage.getUser();
      return mockApi.getHistory(user?.id || '1');
    }

    const response = await this.client.get<Scan[]>(API_ENDPOINTS.HISTORY);
    return response.data;
  }

  // Profile APIs
  async getProfile(): Promise<User> {
    if (USE_MOCK_API) {
      const user = await storage.getUser();
      return mockApi.getProfile(user?.id || '1');
    }

    const response = await this.client.get<User>(API_ENDPOINTS.PROFILE);
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    if (USE_MOCK_API) {
      const user = await storage.getUser();
      return mockApi.updateProfile(user?.id || '1', data);
    }

    const response = await this.client.put<User>(
      API_ENDPOINTS.UPDATE_PROFILE,
      data
    );
    return response.data;
  }

  // Notification APIs
  async getNotifications(): Promise<Notification[]> {
    if (USE_MOCK_API) {
      const user = await storage.getUser();
      return mockApi.getNotifications(user?.id || '1');
    }

    const response = await this.client.get<Notification[]>(
      API_ENDPOINTS.NOTIFICATIONS
    );
    return response.data;
  }

  // Report APIs
  async generateReport(scanId: string): Promise<string> {
    if (USE_MOCK_API) {
      return mockApi.generateReport(scanId);
    }

    const response = await this.client.get<{ url: string }>(
      `${API_ENDPOINTS.REPORT}/${scanId}`
    );
    return response.data.url;
  }
}

export const api = new ApiService();
