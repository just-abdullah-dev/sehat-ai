# SehatAI Integration Plan

## Overview

Full integration between the FastAPI backend and React Native frontend.
This document covers every change required — no API left unmapped, no screen left unintegrated.

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Guest predictions | Make `/predict/` accept optional auth — if no token, run ML but skip DB save |
| Profile management | Add `GET /user/profile/` and `PUT /user/profile/` endpoints to backend |
| Token storage | Use `expo-secure-store` (device keychain/keystore) |

---

## Current API Mismatch Analysis

| Frontend URL | Backend URL | Status |
|---|---|---|
| `POST /auth/signup` | `POST /auth/register` | Fix URL |
| `POST /auth/login` | `POST /auth/login` | OK |
| `POST /auth/logout` | *(none — client-side only)* | Remove API call |
| `POST /predict` | `POST /predict/?model=tb\|pneumonia` | Fix + add model param |
| `GET /user/history` | `GET /history/` | Fix URL |
| `GET /user/profile` | *(none)* | Add to backend |
| `PUT /user/update` | *(none)* | Add to backend |
| `GET /user/report/:id` | `GET /report/{scan_id}` | Fix URL |
| `GET /user/notifications` | *(none — not in backend)* | Remove / mock only |

---

## Phase 1 — Backend Modifications

### 1.1 Make Prediction Endpoint Support Optional Auth

**File:** `Backend/app/api/prediction.py`

- Change auth dependency from `required` to `optional`
- If user token present → save scan to DB as normal
- If no token (guest) → run ML inference only, return results without DB write, `scan_id: null`

**File:** `Backend/app/core/security.py`

- Add `get_optional_current_user()` dependency that returns `None` instead of raising 401

### 1.2 Add User Profile Model Fields

**File:** `Backend/app/models/user.py`

Add fields to `users` table:
- `phone` — String, nullable
- `age` — Integer, nullable
- `gender` — String, nullable (`male`, `female`, `other`)
- `symptoms` — Text, nullable
- `medicines` — Text, nullable (stored as comma-separated)

### 1.3 Add Profile Endpoints

**File:** `Backend/app/api/profile.py` *(new file)*

- `GET /user/profile/` — Returns current user's full profile (requires auth)
- `PUT /user/profile/` — Updates user profile fields (requires auth)

**File:** `Backend/app/schemas/profile.py` *(new file)*

- `ProfileResponse` schema
- `ProfileUpdate` schema

**File:** `Backend/app/main.py`

- Register the new profile router

---

## Phase 2 — Frontend: Infrastructure & Setup

### 2.1 Install expo-secure-store

```bash
npx expo install expo-secure-store
```

### 2.2 Update API Constants

**File:** `App/src/utils/constants.ts`

Fix all endpoint URLs:
```typescript
BASE_URL: "http://10.0.2.2:8000"  // Android emulator → localhost
           "http://localhost:8000"  // iOS simulator

API_ENDPOINTS = {
  // Auth
  LOGIN:   '/auth/login',
  REGISTER: '/auth/register',      // was /auth/signup
  REFRESH: '/auth/refresh',        // add this

  // Predict
  PREDICT: '/predict/',            // was /predict (add trailing slash + model query param)

  // History
  HISTORY: '/history/',            // was /user/history

  // Profile
  PROFILE:        '/user/profile/',  // new
  UPDATE_PROFILE: '/user/profile/',  // new (PUT)

  // Reports
  REPORT: '/report/',              // was /user/report/:id
}
```

### 2.3 Rewrite Auth Context with Secure Storage

**File:** `App/src/context/AuthContext.tsx`

Changes:
- Replace AsyncStorage with `expo-secure-store` for token storage
- Keep AsyncStorage only for non-sensitive data (user display info)
- Add token refresh logic: intercept 401 → try `/auth/refresh` → retry original request → if refresh fails, logout
- Add profile cache: store profile in memory, only re-fetch from API when update occurs
- `continueAsGuest()` — sets guest mode, no token stored

### 2.4 Rewrite API Service

**File:** `App/src/services/api.ts`

- Set `USE_MOCK_API = false`
- Fix all endpoint URLs (see 2.2)
- Token from `expo-secure-store`
- Axios request interceptor: attach `Authorization: Bearer <token>`
- Axios response interceptor:
  - On 401: attempt token refresh
  - If refresh succeeds: retry original request
  - If refresh fails: logout and redirect to login
- Guest mode: skip auth header for prediction

---

## Phase 3 — Frontend: Screen-by-Screen Integration

### 3.1 Auth — Login Screen (`app/(auth)/login.tsx`)

Current: Calls `api.login()` with mock
Changes:
- Call real `POST /auth/login` with `{ email, password }`
- Store `access_token` in `expo-secure-store`
- Store `refresh_token` in `expo-secure-store`
- Store `{ username, email, id }` from token decode in memory + AsyncStorage (not sensitive)
- On success: navigate to `/(tabs)`
- Remove demo credentials card (or keep for dev — user's choice)

### 3.2 Auth — Sign Up Screen (`app/(auth)/signup.tsx`)

Current: Calls `api.signup()` with mock, has "Full Name" field
Changes:
- Map "Full Name" → `username` field (backend expects `username`)
- Call real `POST /auth/register` with `{ email, username, password }`
- On success: auto-login (call login endpoint with same credentials)
- Store tokens same as login
- Navigate to `/(tabs)`

### 3.3 Home Screen — Prediction Flow (`app/(tabs)/index.tsx`)

This is the biggest change. Current: single image upload → single result.

**New UI flow:**

1. User picks image from camera/gallery
2. **Disease Selection** appears:
   - [ ] Tuberculosis (TB)
   - [ ] Pneumonia
   - [x] Both (default)
3. "Analyze" button
4. Loading state (shows which model is running)
5. Results shown in-screen (not just alert):
   - If TB selected: TB result card (Positive/Normal + confidence %)
   - If Pneumonia selected: Pneumonia result card (Positive/Normal + confidence %)
   - If Both: both cards shown side by side / stacked
6. **Export options** (authenticated only):
   - "Download TB Report" (if TB analyzed)
   - "Download Pneumonia Report" (if Pneumonia analyzed)
   - "Download Both Reports"
7. For guests: show results, show "Sign in to download reports" prompt

**API calls:**
- For TB: `POST /predict/?model=tb` (multipart image)
- For Pneumonia: `POST /predict/?model=pneumonia` (multipart image)
- For Both: two parallel API calls
- Guest: same calls, no auth header → backend skips DB save

**Guest mode:**
- No token → no auth header
- Backend runs inference, returns result, `scan_id: null`
- Frontend shows results
- No history save (no scan_id)
- Export buttons disabled with "Login to download" tooltip

**Response handling:**
```typescript
// Backend response:
{
  scan_id: number | null,   // null for guests
  result: "Positive" | "Normal",
  confidence: number,       // 0-1
  processing_time: number,
  model_used: "tb" | "pneumonia",
  message: string
}
```

### 3.4 History Screen (`app/(tabs)/history.tsx`)

Current: Uses mock data with guest overlay

Changes:
- Call real `GET /history/` (requires auth — guests get the locked overlay, no change needed)
- Query params: `?model=tb`, `?model=pneumonia`, or no filter (all)
- Map backend response fields to frontend `Scan` type:
  - `id` → `id`
  - `model_used` → `model` (lowercase: "tb" / "pneumonia")
  - `result` → `result` ("Positive" / "Normal")
  - `confidence` → `confidence`
  - `created_at` → `timestamp`
  - `file_url` → `imageUrl` (prepend BASE_URL if relative)
- Statistics: count TB, Pneumonia, Normal from returned list
- Filter bar: All / TB / Pneumonia / Normal
- ResultCard: tap → open report modal for that scan_id
- Cache last fetch in AsyncStorage for offline fallback

### 3.5 Profile Screen (`app/(tabs)/profile.tsx`)

Current: Uses mock data with guest overlay

Changes:
- Call real `GET /user/profile/` on mount
- **Profile Caching:** Store profile in `AuthContext` memory. Only call API again when:
  - User explicitly saves changes (PUT)
  - User force-refreshes (pull-to-refresh)
- Field mapping:
  - `username` → Full Name field
  - `email` → Email field
  - `phone`, `age`, `gender`, `symptoms`, `medicines` → extended fields (new backend)
- Save: call `PUT /user/profile/` → update memory cache → no API call on next page visit
- Show `created_at` as "Member since" date

### 3.6 Report Modal (`app/modal.tsx`)

Current: Generates fake URL

Changes:
- Receives `scanId` via query param (already set up)
- **Auth gate:** Guest users → show "Sign in to download reports" message only, no generate button
- For authenticated users:
  - Language selector: English / Urdu (maps to `?language=en` or `?language=ur`)
  - "Download Report" → call `GET /report/{scan_id}?language=en`
  - Backend returns PDF binary → save to device with `expo-file-system`
  - "Share Report" → share saved PDF with `expo-sharing`
  - "View in Browser" → open with `expo-web-browser` (base64 or temp file)
- For "Both" prediction results on Home screen:
  - "Download TB Report" — opens modal with TB scan_id
  - "Download Pneumonia Report" — opens modal with Pneumonia scan_id
  - "Download Both" — triggers both downloads sequentially

### 3.7 Settings Screen (`app/(tabs)/settings.tsx`)

Current: Logout clears state, delete account shows alert

Changes:
- Logout: clear `expo-secure-store` tokens + AsyncStorage user data + reset AuthContext
- Token cleared on logout → next app open shows login screen
- Dark mode / language: already working via ThemeContext, keep as-is
- "Download My Data" — not in backend, keep "coming soon"
- "Delete Account" — not in backend, keep warning alert for now

---

## Phase 4 — Type Updates

**File:** `App/src/types/index.ts`

Updates needed:
```typescript
// Auth tokens
interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Register request
interface RegisterRequest {
  email: string;
  username: string;  // not full_name
  password: string;
}

// Prediction response (backend actual format)
interface PredictionResponse {
  scan_id: number | null;  // null for guests
  result: 'Positive' | 'Normal';
  confidence: number;
  processing_time: number;
  model_used: 'tb' | 'pneumonia';
  message: string;
  file_url: string;
}

// Combined prediction result (for "Both" mode)
interface CombinedPredictionResult {
  tb?: PredictionResponse;
  pneumonia?: PredictionResponse;
}

// Disease selection
type DiseaseSelection = 'tb' | 'pneumonia' | 'both';

// Profile (extended)
interface UserProfile {
  id: number;
  email: string;
  username: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  symptoms?: string;
  medicines?: string[];
  created_at: string;
}

// Scan history item (backend format)
interface ScanHistoryItem {
  id: number;
  file_url: string;
  model_used: 'tb' | 'pneumonia';
  result: 'Positive' | 'Normal';
  confidence: number;
  processing_time: number;
  created_at: string;
}
```

---

## Phase 5 — Backend: Alembic Migration

Add new profile fields to the DB via Alembic migration:
- `phone`, `age`, `gender`, `symptoms`, `medicines` on `users` table

---

## Implementation Order

1. **Backend changes** (modify prediction auth, add profile model + endpoints + migration)
2. **Install expo-secure-store** in App
3. **Update types** (`src/types/index.ts`)
4. **Update constants** (`src/utils/constants.ts`)
5. **Rewrite API service** (`src/services/api.ts`)
6. **Rewrite AuthContext** (`src/context/AuthContext.tsx`)
7. **Update Login screen**
8. **Update Signup screen**
9. **Update Home screen** (prediction flow — largest change)
10. **Update History screen**
11. **Update Profile screen**
12. **Update Report modal**
13. **Update Settings screen**
14. **Setup Python venv (Python 3.11)** — last step as requested

---

## File Change Summary

### Backend (modified)
- `app/api/prediction.py` — optional auth
- `app/api/profile.py` *(new)* — profile endpoints
- `app/core/security.py` — add `get_optional_current_user`
- `app/models/user.py` — add profile fields
- `app/schemas/profile.py` *(new)* — profile schemas
- `app/main.py` — register profile router

### Frontend (modified)
- `src/types/index.ts` — updated types
- `src/utils/constants.ts` — fixed URLs
- `src/services/api.ts` — real API, secure store, token refresh
- `src/context/AuthContext.tsx` — secure store, profile cache
- `app/(auth)/login.tsx` — real auth
- `app/(auth)/signup.tsx` — real register
- `app/(tabs)/index.tsx` — disease selection, dual prediction, results UI
- `app/(tabs)/history.tsx` — real history API
- `app/(tabs)/profile.tsx` — real profile API with cache
- `app/(tabs)/settings.tsx` — proper logout
- `app/modal.tsx` — real PDF download, auth gate, language selector
