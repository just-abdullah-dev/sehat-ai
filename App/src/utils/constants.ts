import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Application constants

// API Configuration
// Android emulator: 10.0.2.2 maps to host machine localhost
// iOS simulator: localhost works directly
const expoApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const expoHostUri =
  (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
  (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra?.expoClient?.hostUri;

const resolveApiBaseUrl = (): string => {
  if (expoApiUrl && !expoApiUrl.includes('localhost')) {
    return expoApiUrl;
  }

  if (!__DEV__) {
    return expoApiUrl ?? 'http://localhost:8000';
  }

  // Android emulator cannot reach host localhost directly.
  if (Platform.OS === 'android' && expoHostUri?.includes('127.0.0.1')) {
    return 'http://10.0.2.2:8000';
  }

  // In Expo Go on a physical device, route API calls to the same LAN host as Metro.
  const host = expoHostUri?.split(':')[0];
  if (host) {
    return `http://${host}:8000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
};

export const API_CONFIG = {
  BASE_URL: resolveApiBaseUrl(),
  TIMEOUT: 30000,  // 30s to account for ML inference time
};

// Secure Storage Keys (expo-secure-store — for sensitive data)
export const SECURE_KEYS = {
  ACCESS_TOKEN: 'sehatai_access_token',
  REFRESH_TOKEN: 'sehatai_refresh_token',
};

// AsyncStorage Keys (for non-sensitive data)
export const STORAGE_KEYS = {
  USER_DATA: '@sehatai_user_data',
  PROFILE_DATA: '@sehatai_profile_data',
  SETTINGS: '@sehatai_settings',
  CACHED_SCANS: '@sehatai_cached_scans',
  LANGUAGE: '@sehatai_language',
  THEME: '@sehatai_theme',
};

// API Endpoints (must match backend exactly)
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  VERIFY_OTP: '/auth/verify-otp',
  RESET_PASSWORD: '/auth/reset-password',

  // Prediction  — append ?model=tb or ?model=pneumonia; /both/ for both models in one call
  PREDICT: '/predict/',
  PREDICT_BOTH: '/predict/both/',

  // History — append ?model=tb|pneumonia for filtering
  HISTORY: '/history/',

  // Profile
  PROFILE: '/user/profile/',
  UPDATE_PROFILE: '/user/profile/',

  // Reports — append /{scan_id}?language=en|ur
  REPORT: 'report/',
};

// App Configuration
export const APP_CONFIG = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  CACHE_LIMIT: 10,
  SESSION_TIMEOUT_DAYS: 7,
  MIN_PASSWORD_LENGTH: 8,
};

// Result Colors
export const RESULT_COLORS = {
  Positive: '#FF6B6B',
  Normal: '#51CF66',
  TB: '#FF6B6B',
  Pneumonia: '#FFA94D',
};

// Chart Configuration
export const CHART_CONFIG = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#0a7ea4',
  },
};
