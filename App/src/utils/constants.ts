// Application constants

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:8000/api'
    : 'https://api.sehatai.com/api',
  TIMEOUT: 10000,
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@sehatai_auth_token',
  USER_DATA: '@sehatai_user_data',
  SETTINGS: '@sehatai_settings',
  CACHED_SCANS: '@sehatai_cached_scans',
  LANGUAGE: '@sehatai_language',
  THEME: '@sehatai_theme',
};

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  PREDICT: '/predict',
  HISTORY: '/user/history',
  REPORT: '/user/report',
  PROFILE: '/user/profile',
  UPDATE_PROFILE: '/user/update',
  NOTIFICATIONS: '/user/notifications',
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
  TB: '#FF6B6B',
  Pneumonia: '#FFA94D',
  Normal: '#51CF66',
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
