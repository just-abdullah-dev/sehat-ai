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

export interface LungZoneAnalysis {
  zone: string;
  mean_activation: number;
  severity: 'Minimal' | 'Low' | 'Medium' | 'High';
  affected: boolean;
}

export interface GradCAMReport {
  // Base64 PNG strings - may be null when server mode is "url"
  original_b64: string | null;
  clahe_b64: string | null;
  heatmap_b64: string | null;
  overlay_b64: string | null;

  // File URLs - may be null when server mode is "base64"
  original_url: string | null;
  clahe_url: string | null;
  heatmap_url: string | null;
  overlay_url: string | null;

  // Analysis - always present
  lung_zones: LungZoneAnalysis[];
  affected_zones: string[];
  primary_affected_zone: string;
  overall_activation: number;
  last_conv_layer: string;
}

export interface DetailedPneumoniaPrediction {
  scan_id: number | null;
  result: 'Positive' | 'Normal';
  confidence: number;
  processing_time: number;
  model_used: string;
  file_url: string;
  message: string;
  threshold: number;
  gradcam: GradCAMReport;
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
