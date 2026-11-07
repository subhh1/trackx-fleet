# TRACKX Security Architecture

## Authentication

### Administrator
- Firebase Authentication (Email/Password)
- Admin role stored in RTDB `/admins/{uid}`
- Role verified on every read/write via security rules
- Session managed via Firebase Auth tokens

### Driver
- Anonymous Firebase Authentication
- Authenticated via registration token validation
- UID linked to driver record after registration
- Cannot escalate to admin role
- Must explicitly enable sharing from their device
- Can write location data only while sharing is enabled

## Registration Security

### QR Code Tokens
- **Format**: 64-character hex string (256-bit entropy)
- **Generation**: Cryptographically random on the server
- **Lifetime**: 24 hours maximum
- **Usage**: Single-use only
- **Storage**: Firebase Realtime Database; creation and validation happen through Cloud Functions
- **Content**: Never contains passwords or admin credentials

### Registration Flow
1. Admin generates token → stored in Firebase
2. Driver scans QR → app extracts token
3. Cloud Function validates token (checks expiry, usage)
4. Driver app creates an anonymous Firebase Auth account
5. Cloud Function atomically marks token as used and creates the driver record for the authenticated UID

### Attack Prevention
- **Replay attacks**: Tokens are single-use
- **Brute force**: 256-bit token space
- **Expired tokens**: Server-side validation rejects
- **Privilege escalation**: Drivers cannot write to `/admins`
- **Cross-driver access**: Security rules enforce UID-based access
- **Admin actions**: Callable functions verify the caller's `/admins/{uid}` record

## Data Protection

### Location Data
- Encrypted in transit (HTTPS/TLS)
- Encrypted at rest (Firebase default)
- Only accessible to:
  - The driver who generated it
  - Authenticated administrators
- Never exposed in URLs or client-side storage

### Database Rules
```
- Admins: Full read access to all driver data
- Drivers: Read own profile and history; write while sharing is enabled
- Drivers: Cannot modify trackingId
- Drivers: Cannot access other drivers' history
- Registration tokens: Readable by administrators; created and consumed through Cloud Functions
```

## Network Security

- All communication over HTTPS
- Firebase web API keys are public identifiers; restrict them by domain/app
- Never commit service-account credentials or signing keys
- CORS configured for admin domain only

## Privacy Compliance

### Driver Consent
- Explicit consent required before tracking starts
- Clear disclosure of what data is collected
- Visible notification when tracking is active
- Driver can pause/stop sharing at any time
- Driver informed of administrator access

### Data Retention
- Location history: 7 days maximum
- Automatic cleanup via Cloud Function
- Latest location preserved (not deleted with history)
- Administrator removal deletes the driver's Auth account and location data

## Known Limitations

1. **No end-to-end encryption**: Firebase has access to data at rest
2. **Admin dashboard**: Requires internet connection
3. **GPS accuracy**: Depends on device hardware and environment
4. **Battery impact**: Continuous GPS tracking consumes battery
5. **OS restrictions**: Android/iOS may limit background location

## Security Checklist

- [x] Firebase Authentication enabled
- [x] Database security rules deployed
- [x] Cloud Functions validate all operations
- [x] Registration tokens are single-use
- [x] No credentials in client code
- [x] HTTPS-only communication
- [x] Input validation on all writes
- [x] Admin role protection
- [x] Driver isolation enforced
- [x] Tracking consent implemented
- [x] Visible tracking indicator
- [x] Data retention policy (7 days)
- [x] Secure account deletion
