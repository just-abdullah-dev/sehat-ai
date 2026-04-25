// TypeScript types for the application

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;   // backend uses 'username' (mapped from Full Name in UI)
  password: string;
}

// ─── User / Profile ──────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  username: string;
  phone?: string;
  date_of_birth?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  symptoms?: string;
  medicines?: string[];
  created_at: string;
}

export interface ProfileUpdate {
  username?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  symptoms?: string;
  medicines?: string[];
}

// ─── Prediction ───────────────────────────────────────────────────────────────

export type DiseaseModel = 'tb' | 'pneumonia';
export type DiseaseSelection = 'tb' | 'pneumonia' | 'both';

export interface PredictionResponse {
  scan_id: number | null;   // null for guests
  result: 'Positive' | 'Normal';
  confidence: number;       // 0–1
  processing_time: number;
  model_used: DiseaseModel;
  file_url: string;
  message: string;
}

export interface CombinedPredictionResult {
  tb?: PredictionResponse;
  pneumonia?: PredictionResponse;
  imageUri: string;
}

// ─── Scan History ─────────────────────────────────────────────────────────────

export interface ScanHistoryItem {
  id: number;
  file_url: string;
  model_used: DiseaseModel;
  result: 'Positive' | 'Normal';
  confidence: number;
  processing_time: number;
  created_at: string;
}

export interface ScanHistoryResponse {
  total: number;
  scans: ScanHistoryItem[];
}

// ─── Legacy scan shape used across existing UI components ────────────────────

export interface Scan {
  id: string;
  model: DiseaseModel;
  imageUrl: string;
  result: 'Positive' | 'Normal';
  confidence: number;
  timestamp: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'en' | 'ur';
  notificationsEnabled: boolean;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export type ReportLanguage = 'en' | 'ur';
