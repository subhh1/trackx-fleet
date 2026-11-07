# TRACKX Installation Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Flutter SDK 3.0+ (for driver app)
- Google Maps API key (for driver app)

## 1. Admin Dashboard Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 2. Firebase Setup

```bash
# Login to Firebase
firebase login

# Initialize project
firebase init

# Select: Realtime Database, Functions, Hosting

# Deploy database rules
firebase deploy --only database

# Deploy Cloud Functions
cd firebase/functions
npm install
npm run build
cd ../..
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting
```

## 3. Flutter Driver App

```bash
cd driver_app

# Install dependencies
flutter pub get

# Configure Firebase
# Copy your Firebase config to:
# android/app/google-services.json
# ios/Runner/GoogleService-Info.plist

# Run on Android
flutter run

# Build APK
flutter build apk --release

# Build iOS (requires macOS)
flutter build ios --release
```

## 4. Environment Configuration

Create `.env` file in project root:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## 5. Google Maps Setup (Driver App)

1. Go to Google Cloud Console
2. Create a new project
3. Enable Maps SDK for Android/iOS
4. Create API key with restrictions
5. Add to app configuration

## Testing

```bash
# Run dashboard tests
npm run test

# Run Flutter tests
cd driver_app
flutter test
```
