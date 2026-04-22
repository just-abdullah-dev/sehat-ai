# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SehatAI is a comprehensive healthcare mobile application for TB & Pneumonia detection using AI-powered chest X-ray analysis. Built with React Native and Expo, it provides users with instant diagnostic predictions, medical history tracking, and report generation capabilities.

## Tech Stack

- **Framework**: Expo ~54.0.20 with React Native 0.81.5
- **Routing**: Expo Router ~6.0.13 (file-based routing)
- **State Management**: React Context API (AuthContext, ThemeContext)
- **Forms**: Formik + Yup validation
- **API**: Axios with mock backend support
- **Charts**: React Native Chart Kit
- **Storage**: AsyncStorage for offline caching
- **Notifications**: Expo Notifications
- **Image Handling**: Expo Image Picker
- **Language**: TypeScript with strict mode enabled

## Development Commands

### Starting the App
```bash
npx expo start          # Start development server
npm start              # Same as above
npm run android        # Run on Android emulator
npm run ios            # Run on iOS simulator
npm run web            # Run in web browser
```

### Code Quality
```bash
npm run lint           # Run ESLint using expo lint
```

### Demo Credentials
- **Email**: abdullah@test.com
- **Password**: Test@123

## Architecture

### Directory Structure
```
sehat-ai/
├── app/
│   ├── (auth)/         # Authentication screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/         # Main app tabs
│   │   ├── index.tsx       # Home/Dashboard
│   │   ├── history.tsx     # Scan history with charts
│   │   ├── profile.tsx     # User profile
│   │   ├── settings.tsx    # App settings
│   │   └── _layout.tsx
│   ├── modal.tsx       # Report viewer modal
│   └── _layout.tsx     # Root layout with auth logic
├── src/
│   ├── context/        # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── services/       # API services
│   │   ├── api.ts          # Main API service
│   │   └── mockApi.ts      # Mock backend (for development)
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   └── utils/          # Utilities
│       ├── constants.ts    # App constants & config
│       ├── storage.ts      # AsyncStorage helpers
│       ├── validation.ts   # Yup schemas
│       └── notifications.ts # Push notification helpers
├── components/         # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── LoadingSpinner.tsx
│   └── ResultCard.tsx
└── constants/
    └── theme.ts        # Colors and fonts
```

### Navigation Flow

1. **Authentication Flow**:
   - App starts at login screen
   - After successful login/signup, redirects to (tabs)
   - JWT token stored in AsyncStorage
   - Auto-login on app restart if token exists

2. **Main App Flow**:
   - Home → Upload X-ray → View Results → History
   - Profile → Edit Info → Save
   - Settings → Toggle Theme/Language → Logout

### Key Features

#### 1. Authentication (JWT-based)
- Login/Signup with validation
- Secure token storage
- Auto-logout on session expiry (7 days)
- Mock authentication for development

#### 2. X-ray Upload & Analysis
- Camera and gallery image picker
- File size validation (max 10MB)
- AI prediction simulation with confidence scores
- Results: TB, Pneumonia, or Normal
- Processing time: ~3 seconds (simulated)

#### 3. Scan History
- List view with filter by result type
- Line chart showing confidence trends
- Stats cards (TB, Pneumonia, Normal counts)
- Offline caching (last 10 scans)
- Pull-to-refresh

#### 4. Profile Management
- Editable user information
- Medical records (symptoms, medicines)
- Gender selection
- Form validation with Yup

#### 5. Settings
- Dark/Light theme toggle
- Language selection (English/Urdu)
- Push notification settings
- Logout and account deletion

#### 6. Reports
- Generate PDF reports
- Download reports
- Share via email/WhatsApp
- View in browser

### API Integration

#### Mock API (Development)
- Toggle in `src/services/api.ts`: `USE_MOCK_API = true`
- Simulates network delays (500ms - 3s)
- Pre-populated with sample data
- Random prediction generation

#### Real API (Production)
- Base URL: Configured in `src/utils/constants.ts`
- Endpoints:
  - `POST /auth/login`
  - `POST /auth/signup`
  - `POST /predict` (multipart/form-data)
  - `GET /user/history`
  - `GET /user/profile`
  - `PUT /user/update`
  - `GET /user/report/:id`
  - `GET /user/notifications`

#### Request/Response Flow
1. API requests auto-attach JWT token via Axios interceptor
2. 401 responses trigger auto-logout
3. Errors displayed via Alert dialogs
4. Loading states managed with LoadingSpinner component

### State Management

#### AuthContext
- `user`: Current user object
- `token`: JWT token
- `isAuthenticated`: Boolean auth status
- `isLoading`: Initial load state
- `login()`, `signup()`, `logout()`, `updateUser()`

#### ThemeContext
- `theme`: 'light' | 'dark'
- `language`: 'en' | 'ur'
- `settings`: All app settings
- `toggleTheme()`, `setLanguage()`, `updateSettings()`

### Offline Support
- Last 10 scans cached in AsyncStorage
- History screen loads from cache when offline
- User data and settings persisted locally
- Graceful degradation when API fails

### Form Validation

All forms use Formik + Yup:
- **Login**: Email format, password min 8 chars
- **Signup**: Name min 2 chars, strong password (uppercase, lowercase, number), password confirmation
- **Profile**: Email, phone (10-15 digits), age (1-150), gender validation

### Theming

Dynamic theming with light/dark support:
- Colors defined in `constants/theme.ts`
- System theme detection on first launch
- User preference stored in AsyncStorage
- All components use theme-aware colors
- Tab bar and navigation themed

### Notifications

Expo Push Notifications configured for:
- Scan reminders (14 days after last scan)
- Medication schedules
- Result notifications
- Permission handling

### Path Aliases
All imports use `@/` prefix:
```typescript
import { api } from '@/src/services/api';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/theme';
```

## Key Conventions

### Component Structure
```typescript
export default function ScreenName() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  // Component logic

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Content */}
    </View>
  );
}
```

### API Calls
```typescript
const loadData = async () => {
  try {
    setIsLoading(true);
    const data = await api.someMethod();
    setData(data);
  } catch (error: any) {
    Alert.alert('Error', error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### TypeScript Types
All types defined in `src/types/index.ts`:
- User, Scan, PredictionResult, Notification, etc.
- Use strict typing for all props and state

## Troubleshooting

### Mock vs Real API
- Switch in `src/services/api.ts` by changing `USE_MOCK_API`
- Mock data in `src/services/mockApi.ts`
- Default credentials: abdullah@test.com / Test@123

### Common Issues
1. **Images not loading**: Check file size (<10MB) and format
2. **Auth not persisting**: Clear AsyncStorage and re-login
3. **Charts not rendering**: Ensure data array has items
4. **Theme not updating**: Check ThemeContext provider wrapping

## Testing

Manual testing checklist:
- [ ] Login with demo credentials
- [ ] Upload image from camera/gallery
- [ ] View prediction results
- [ ] Check history with filters
- [ ] Edit profile information
- [ ] Toggle dark mode
- [ ] Generate and download report
- [ ] Logout and re-login

## Future Enhancements

As per SRS document:
- Doctor role and patient sharing
- Voice-based symptom input
- Wearable device integration
- Offline TensorFlow Lite inference
- Urdu language translation
- In-app doctor consultation

## Platform Specifics

### Android
- Min SDK: 21 (Android 5.0)
- Adaptive icons configured
- Edge-to-edge UI enabled

### iOS
- Min iOS: 13.0
- Tablet support enabled
- SF Symbols for icons

### Web
- Responsive design
- Desktop and mobile layouts
- Browser compatibility: Modern browsers

## Security

- HTTPS required for production API
- JWT token encrypted in AsyncStorage
- Input validation on all forms
- File upload size limits
- No sensitive data in git

## Contact

Developed by: Abdullah, Abbas Mushtaq
Supervisor: Dr. Abdul Waheed Khan
Institute: Pak-Austria Fachhochschule, Haripur
