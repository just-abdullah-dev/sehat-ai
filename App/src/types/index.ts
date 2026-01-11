// TypeScript types for the application

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  profileImage?: string;
  symptoms?: string;
  medicines?: string[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface Scan {
  id: string;
  userId: string;
  imageUrl: string;
  result: 'TB' | 'Pneumonia' | 'Normal';
  confidence: number;
  timestamp: string;
  notes?: string;
}

export interface PredictionResult {
  result: 'TB' | 'Pneumonia' | 'Normal';
  confidence: number;
  scanId: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'reminder' | 'medication' | 'general';
  timestamp: string;
  read: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'en' | 'ur';
  notificationsEnabled: boolean;
}
