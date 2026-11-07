# TRACKX - Real-Time Fleet Tracking Platform

A modern, cloud-native real-time GPS fleet tracking system powered by **Google Cloud Firestore**, **Firebase Authentication**, and **Firebase Hosting**.

🌐 **Fleet Management Dashboard**: [https://track-x-fleet-902f6.web.app](https://track-x-fleet-902f6.web.app)  
📱 **Driver Mobile Telemetry Portal**: [https://track-x-fleet-902f6.web.app/driver](https://track-x-fleet-902f6.web.app/driver)

---

## Architecture Overview

```
TRACKX/
├── workspace/
│   ├── src/
│   │   ├── components/         # LiveMap (Google Maps), DriverTable, StatsCards, AddDriverModal, DriverQrScanner, InstallApkModal
│   │   ├── contexts/           # AuthContext (Firebase Auth) & FleetContext (Firestore onSnapshot)
│   │   ├── pages/              # DashboardPage, DriversPage, MapPage, HistoryPage, DriverPortalPage, LoginPage
│   │   └── firebase.ts         # Firebase App, Auth, and Firestore initialization
│   ├── public/                 # PWA Manifest, High-Res PNG Icons (192x192, 512x512, Maskable), Service Worker (sw.js)
│   ├── driver_app/             # Flutter Native Mobile Tracker (Android / iOS)
│   │   ├── android/            # Android configuration with google-services.json
│   │   └── lib/                # Background GPS telemetry services (5-second intervals)
│   ├── firestore.rules         # Hardened Cloud Firestore Security Rules
│   └── firebase.json           # Firebase Hosting & Auth configuration
└── .github/workflows/          # Automated Cloud Build for Android APK
```

---

## Key Features

- **24/7 Cloud Hosted**: Live on Google Firebase Hosting with global CDN, automated SSL, and zero local server requirements.
- **Dedicated Driver Authentication Portal**:
  - Independent **Driver Sign In** and **Driver Account Creation** (Email/Password, Full Name, Vehicle Model, Phone Number).
  - Quick Guest Mode for emergency road tracking without account registration.
  - Role-based separation keeping administrator and driver sessions isolated.
- **In-Browser Camera QR Code Scanner**:
  - Integrated `html5-qrcode` scanner utilizing the smartphone's camera directly in the web app.
  - Automatically parses invite URLs or tracking codes (`TRK-XXX`) and binds vehicles to driver accounts in Firestore.
- **Strict 5-Second GPS Telemetry Heartbeat**:
  - Transmits high-accuracy latitude, longitude, speed (km/h), heading, and GPS accuracy ($\pm$ meters) every 5 seconds.
  - Real-time countdown HUD showing next cloud sync cadence (`Next sync: 5s → 4s → ...`).
  - Screen WakeLock ensures mobile display stays on during driving.
- **Live Google Maps Fleet Visualization**:
  - Dynamic layer switcher (**Google Maps Roadmap**, **Google Satellite / Hybrid**, and **Dark Fleet Mode**).
  - Automatically pans and centers to active vehicles with valid coordinates.
  - Real-time `onSnapshot` Firestore listeners update markers without page refreshes.
- **Direct Phone App (WebAPK) Installation**:
  - Full PWA compliance with Service Worker, high-resolution icons, and WebAPK metadata.
  - Drivers can install it natively on Android via Chrome (**⋮ Menu → "Install app"**) with zero parse errors.

---

## Quick Start (Local Development)

```bash
# Navigate to workspace
cd workspace

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` (Admin Dashboard) or `http://localhost:3000/driver` (Driver Portal).

---

## Deploy to Google Cloud

To deploy changes to Firebase Hosting and Firestore rules:

```bash
# Build production bundle
npm run build

# Deploy Hosting, Auth, and Firestore Rules
npx -y firebase-tools@latest deploy --project track-x-fleet-902f6
```

---

## License

Proprietary - TRACKX Fleet Management System.
