# Known Limitations

## Current Limitations

### 1. GPS Accuracy
- GPS accuracy depends on device hardware, environment, and satellite availability
- Indoor locations may have reduced accuracy (10-50m error)
- Urban canyons (tall buildings) can cause multipath errors
- No guarantee of exact positioning

### 2. Battery Impact
- Continuous GPS tracking consumes significant battery
- Estimated 5-15% battery drain per hour depending on device
- Users should keep devices charged during tracking
- Battery optimization settings may affect tracking reliability

### 3. Background Location
- **Android**: May be restricted by battery optimization settings
  - Users must disable battery optimization for TRACKX
  - Some manufacturers (Xiaomi, Huawei, Samsung) have aggressive battery management
  - Foreground service helps but doesn't guarantee uninterrupted tracking
  
- **iOS**: Background location is limited
  - Blue status bar indicator shows active tracking
  - iOS may suspend app after extended background time
  - Significant location changes help maintain tracking

### 4. Network Dependency
- Real-time updates require internet connectivity
- Offline queue stores up to 500 location records
- Queue syncs when connection is restored
- Extended disconnection may result in data loss (oldest records dropped)

### 5. Firebase Free Tier Limits
- **Realtime Database**: 100 simultaneous connections (free)
  - 50 drivers + admin dashboard = ~51 connections
  - Sufficient for 50 drivers but no headroom
  
- **Cloud Functions**: 2M invocations/month (free)
  - 50 drivers × 12 updates/min × 60 min × 24 hrs = ~1.7M/day
  - May exceed free tier with heavy usage
  
- **Authentication**: Unlimited users (free)
  - No concern for 50 drivers

### 6. Map Rendering
- Dashboard uses OpenStreetMap (Leaflet) - free, no API key needed
- Driver app uses Google Maps - requires API key and may incur costs
- Google Maps free tier: $200/month credit
- Estimated cost for 50 drivers: $0-20/month

### 7. Data Retention
- Location history limited to 7 days
- Automatic cleanup runs daily
- Cannot recover deleted historical data
- Latest location is preserved regardless of history cleanup

### 8. Security
- No end-to-end encryption (Firebase has access to data at rest)
- Admin credentials stored in Firebase Authentication
- QR tokens are secure but rely on Firebase security rules
- No client-side encryption of location data

### 9. Scalability
- Designed for 10-50 drivers
- May require architecture changes for 100+ drivers
- Consider Firestore for larger scale
- May need data partitioning for very large fleets

### 10. Platform-Specific
- **Android**: Fragmentation across manufacturers
  - Different battery optimization behaviors
  - Custom ROMs may have different permission models
  - Tested on Android 10+ recommended
  
- **iOS**: Strict background execution limits
  - iOS 15+ recommended for best background tracking
  - Low Power Mode significantly reduces update frequency
  - Cannot guarantee updates when app is force-quit

## Future Improvements

1. **Geofencing**: Alert when drivers enter/leave zones
2. **Route optimization**: Suggest efficient routes
3. **Driver messaging**: In-app communication
4. **Trip reports**: Automated daily/weekly summaries
5. **Fuel tracking**: Integration with fuel cards
6. **Maintenance alerts**: Vehicle service reminders
7. **Multi-fleet support**: Sub-organizations
8. **White-label**: Custom branding per client
9. **API access**: REST API for third-party integration
10. **Advanced analytics**: Driving behavior scoring
