// Mock API for development - simulates backend responses
// Remove this file when connecting to real backend

import type {
  User,
  AuthResponse,
  LoginCredentials,
  SignupData,
  Scan,
  PredictionResult,
  Notification
} from '@/src/types';

// Mock database
let mockUsers: User[] = [
  {
    id: '1',
    name: 'Abdullah',
    email: 'abdullah@test.com',
    phone: '+923001234567',
    age: 25,
    gender: 'male',
    symptoms: 'Persistent cough, fever',
    medicines: ['Paracetamol', 'Antibiotics'],
    createdAt: new Date().toISOString(),
  },
];

let mockScans: Scan[] = [
  {
    id: '1',
    userId: '1',
    imageUrl: 'https://via.placeholder.com/300',
    result: 'Normal',
    confidence: 95.5,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    userId: '1',
    imageUrl: 'https://via.placeholder.com/300',
    result: 'Pneumonia',
    confidence: 87.2,
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Reminder',
    body: 'Time for your next scan checkup',
    type: 'reminder',
    timestamp: new Date().toISOString(),
    read: false,
  },
];

// Simulate network delay
const delay = (ms: number = 1000) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await delay(1500);

    const user = mockUsers.find(u => u.email === credentials.email);

    if (!user || credentials.password !== 'Test@123') {
      throw new Error('Invalid email or password');
    }

    return {
      token: 'mock_jwt_token_' + Date.now(),
      user,
    };
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    await delay(1500);

    // Check if user already exists
    if (mockUsers.some(u => u.email === data.email)) {
      throw new Error('Email already registered');
    }

    const newUser: User = {
      id: String(mockUsers.length + 1),
      name: data.name,
      email: data.email,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return {
      token: 'mock_jwt_token_' + Date.now(),
      user: newUser,
    };
  },

  async logout(): Promise<void> {
    await delay(500);
    // In mock, just return success
  },

  // Predictions
  async predict(imageUri: string): Promise<PredictionResult> {
    await delay(3000); // Simulate ML processing time

    // Randomly generate a prediction
    const results: Array<'TB' | 'Pneumonia' | 'Normal'> = ['TB', 'Pneumonia', 'Normal'];
    const randomResult = results[Math.floor(Math.random() * results.length)];
    const confidence = 75 + Math.random() * 20; // 75-95%

    const newScan: Scan = {
      id: String(mockScans.length + 1),
      userId: '1',
      imageUrl: imageUri,
      result: randomResult,
      confidence: parseFloat(confidence.toFixed(1)),
      timestamp: new Date().toISOString(),
    };

    mockScans.unshift(newScan);

    return {
      result: randomResult,
      confidence: parseFloat(confidence.toFixed(1)),
      scanId: newScan.id,
      timestamp: newScan.timestamp,
    };
  },

  // History
  async getHistory(userId: string): Promise<Scan[]> {
    await delay(1000);
    return mockScans.filter(scan => scan.userId === userId);
  },

  // Profile
  async getProfile(userId: string): Promise<User> {
    await delay(800);
    const user = mockUsers.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    return user;
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    await delay(1000);
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');

    mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
    return mockUsers[userIndex];
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    await delay(800);
    return mockNotifications;
  },

  // Reports
  async generateReport(scanId: string): Promise<string> {
    await delay(2000);
    // Return a mock PDF URL
    return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  },
};
