# Firebase Setup Guide

## Project Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password + Anonymous)
3. Create Realtime Database
4. Enable Cloud Functions (Blaze plan required)

## Database Structure

```json
{
  "admins": {
    "ADMIN_UID": {
      "email": "admin@trackx.io",
      "name": "Fleet Administrator"
    }
  },
  "drivers": {
    "DRIVER_UID": {
      "name": "Driver Name",
      "trackingId": "TRK-001",
      "status": "online",
      "sharingEnabled": true,
      "lastLocation": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "speed": 45,
        "accuracy": 8
      },
      "lastUpdated": 1700000000000,
      "lastConnection": 1700000000000,
      "registeredAt": 1699000000000
    }
  },
  "locationHistory": {
    "DRIVER_UID": {
      "loc_1700000000000": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "speed": 45,
        "accuracy": 8,
        "timestamp": 1700000000000
      }
    }
  },
  "registrationTokens": {
    "TOKEN_ID": {
      "trackingId": "TRK-001",
      "driverName": "Driver Name",
      "token": "secure_random_token",
      "createdAt": 1700000000000,
      "expiresAt": 1700086400000,
      "used": false
    }
  }
}
```

## Security Rules

Deploy with:
```bash
firebase deploy --only database
```

Rules enforce:
- Only admins can read all driver data
- Drivers can only write their own data
- Drivers cannot modify their trackingId
- Registration tokens are admin-write only
- All data validated against schema

## Cloud Functions

### createRegistrationToken
- Requires an authenticated administrator
- Reserves a unique tracking ID and creates a single-use 24-hour QR token

### validateRegistrationToken
- Validates QR code token
- Checks expiry and usage
- Returns tracking info if valid

### completeRegistration
- Atomically marks token as used and binds it to the authenticated UID
- Creates driver record
- Links Firebase Auth UID to driver data

### setDriverSharing
- Requires an authenticated administrator
- Disables sharing; administrators cannot enable driver location sharing

### removeDriver
- Requires an authenticated administrator
- Deletes the driver's Firebase Auth account, driver record, and location history

### enableDriverSharing
- Requires the registered driver to be authenticated
- Enables sharing only after the driver starts tracking in the app

### updateLocation
- Receives GPS coordinates from driver
- Updates current location
- Adds to history

### cleanupOldLocations (Scheduled)
- Runs daily
- Removes records older than 7 days
- Preserves latest location

### detectStaleDrivers (Scheduled)
- Runs every 5 minutes
- Marks drivers as stale if no update in 15 min

## Deployment

```bash
# Deploy all
firebase deploy

# Deploy specific services
firebase deploy --only database
firebase deploy --only functions
firebase deploy --only hosting
```

## Cost Estimation (10-50 drivers)

| Service | Free Tier | Expected Usage |
|---------|-----------|---------------|
| RTDB Storage | 1 GB | ~100 MB |
| RTDB Downloads | 10 GB/month | ~2-5 GB |
| Cloud Functions | 2M invocations | ~500K |
| Auth Users | Unlimited | 50 |
| Hosting | 10 GB | ~1 GB |

Estimated: **Free tier sufficient** for 50 drivers with moderate usage.
