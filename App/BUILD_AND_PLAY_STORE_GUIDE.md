# Sehat AI Build Guide

This guide covers two deployment targets:

- Android APK for direct installation and testing
- Android App Bundle (AAB) for Google Play Store upload

Important: Google Play Store does not accept APKs for production release. You must upload an AAB.

## 1. Prerequisites

Install these tools first:

- Node.js 18+
- Git
- Android Studio if you want local emulator testing
- Expo account
- EAS CLI (`npm install -g eas-cli` or use `npx eas`)

Recommended Expo account flow:

```bash
npx eas login
```

## 2. Project Setup

From the `App` folder:

```bash
npm install
npx expo-doctor
npm run lint
```

Check that these files exist and are correct:

- `app.json` with Android package name and version code
- `eas.json` with APK and AAB build profiles
- backend API URL set to production for release builds

## 3. Build Types

### APK

Use this when you want to install the app directly on a device or share it outside Play Store.

```bash
npx eas build -p android --profile preview
```

This generates an APK that you can download and install.

### AAB for Play Store

Use this for Google Play Console upload.

```bash
npx eas build -p android --profile production
```

The output will be an `.aab` file.

## 4. Suggested Release Flow

1. Bump the app version in `app.json`.
2. Run lint and smoke test the app.
3. Build APK for local QA.
4. Fix any issues found on-device.
5. Build AAB for Play Store.
6. Upload AAB to Play Console.

## 5. Google Play Store Requirements

Before uploading, make sure you have:

- A unique Android package name
- Version code incremented for every release
- Privacy policy URL
- App icon and splash assets
- Production API endpoint reachable over HTTPS
- Proper content rating and store listing text
- Signed release build from EAS

## 6. Environment Rules

For release builds:

- Use HTTPS API only
- Do not hardcode local IP addresses
- Keep sensitive keys out of source control
- Use a stable backend URL for the store build

Recommended production API URL setting:

```json
"extra": {
  "apiUrl": "https://api.sehatai.com"
}
```

## 7. Testing Checklist Before Release

- Login and signup work
- Prediction upload works
- Report download works
- Share report works
- History screen loads
- Theme and language toggles work
- App opens on a real Android device
- No crashes on startup

## 8. Uploading to Play Store

After EAS builds the AAB:

1. Open Google Play Console.
2. Create or open your app.
3. Upload the `.aab` file to an internal, closed, or production track.
4. Fill in store listing, screenshots, app category, and privacy policy.
5. Submit for review.

## 9. Useful Commands

```bash
# Start development server
npm start

# Build APK
npx eas build -p android --profile preview

# Build AAB
npx eas build -p android --profile production

# Submit release
npx eas submit -p android --profile production
```
