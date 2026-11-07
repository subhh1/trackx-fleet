# Deployment Guide

## Prerequisites

- Firebase project `track-x-fleet-902f6`
- Billing enabled (Blaze plan is required for Cloud Functions)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Node.js 22 (the Cloud Functions runtime configured in this repository)
- Domain for hosting (optional)
- Google Maps API key restricted to the TRACKX Android/iOS apps

The admin dashboard now uses Firebase Authentication, Realtime Database, and callable Cloud Functions. Do not use the old demo credentials. Keep `.env.local`, Firebase service configuration files, signing keys, and API keys out of Git.

## Step 1: Configure Firebase

In the Firebase Console for `track-x-fleet-902f6`:

1. Enable **Authentication → Email/Password** and **Anonymous** sign-in.
2. Create a **Realtime Database** and copy its exact database URL.
3. Register a **Web app** and copy its Firebase config.
4. Link a billing account and switch to the **Blaze** plan before deploying Functions.

Copy `.env.example` to `.env.local` in the repository root and fill in the Web App values. The `VITE_FIREBASE_DATABASE_URL` must be copied from the Realtime Database page; do not guess the URL.

Install the Firebase CLI, sign in, and verify the selected project:

```powershell
npm install -g firebase-tools
firebase login
firebase use
```

`.firebaserc` in this repository selects `track-x-fleet-902f6`.

## Step 2: Deploy Admin Dashboard

```bash
npm install
npm install --prefix firebase/functions
npm run build
firebase deploy --only hosting,database,functions
```

Firebase CLI builds the Functions bundle through the predeploy hook. If deploying Functions separately, install their dependencies first:

```powershell
Push-Location firebase/functions
npm install
npm run build
Pop-Location
firebase deploy --only functions
```

Dashboard URL: `https://track-x-fleet-902f6.web.app`

## Step 3: Create the administrator

1. Firebase Console → **Authentication** → add an Email/Password user.
2. Copy the user's UID.
3. Realtime Database → add `/admins/<UID>` with `email` and `name` fields.
4. Open the dashboard and sign in with that account.

The database rules intentionally do not allow clients to add or edit admin records. Seed the initial admin through the Firebase Console.

## Step 4: Prepare the Driver App

The checked-in Flutter source is not currently a buildable Android/iOS project: native platform scaffolding is missing, and Flutter is not available in this deployment environment. Generate the Android/iOS projects using Flutter, preserving the existing location/camera permissions in `AndroidManifest.xml` and `Info.plist`. Then:

1. Install Flutter and the FlutterFire CLI.
2. Register Android and iOS apps in Firebase using the generated package/bundle identifiers.
3. Run `flutterfire configure --project=track-x-fleet-902f6` from `driver_app` to generate `lib/firebase_options.dart`.
4. Initialize Firebase with `DefaultFirebaseOptions.currentPlatform` in `lib/main.dart`.
5. Add Firebase's Android/iOS app config files and set up Google Maps keys with platform restrictions.
6. Build and test on physical devices before distributing.

Do not commit `.env.local`, service-account credentials, or signing keys. Firebase client configuration is not a service credential, but API keys must be restricted to the intended web domains or mobile apps. The current Android manifest has a Google Maps key in a local uncommitted edit; rotate/restrict that key in Google Cloud before release and configure the replacement outside source control.

### Android
```bash
cd driver_app

# Build release APK
flutter build apk --release

# Build App Bundle (for Play Store)
flutter build appbundle --release
```

### iOS
```bash
cd driver_app

# Configure signing in Xcode

# Build release
flutter build ios --release

# Archive and distribute via Xcode
```

## Step 5: Post-Deployment

1. Add a driver in the dashboard and scan the QR code using the mobile app.
2. Verify registration creates `/drivers/<UID>` and that location updates appear in Realtime Database.
3. Verify the dashboard live map and history views.
4. Monitor Firebase usage and billing.

Administrators can disable sharing from the dashboard. Drivers must explicitly enable it from their own device; an administrator cannot start tracking on a driver's behalf.

## Custom Domain (Optional)

```bash
firebase hosting:channel:deploy production
```

Add custom domain in Firebase Console → Hosting

## Monitoring

### Firebase Console
- Authentication: User management
- Realtime Database: Data monitoring
- Functions: Execution logs
- Hosting: Deployment history

### Cost Alerts
Set up billing alerts at:
https://console.cloud.google.com/billing/alerts

### Recommended Alerts
- Database reads > 50K/day
- Function invocations > 100K/day
- Hosting bandwidth > 5 GB/day

## Rollback

```bash
# List hosting versions
firebase hosting:versions

# Rollback to previous
firebase hosting:clone --source=track-x-fleet-902f6:CHANNEL --destination=track-x-fleet-902f6:live
```

## Production Checklist

- [ ] Firebase project configured
- [ ] Admin account created
- [ ] Database rules deployed
- [ ] Cloud Functions deployed
- [ ] Dashboard hosted
- [ ] Driver app tested on Android
- [ ] Driver app tested on iOS
- [ ] QR registration tested
- [ ] Location tracking verified
- [ ] Offline mode tested
- [ ] Billing alerts configured
- [ ] Monitoring dashboard set up
