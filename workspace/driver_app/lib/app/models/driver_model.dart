class DriverModel {
  final String uid;
  final String name;
  final String trackingId;
  final String status;
  final bool sharingEnabled;
  final double latitude;
  final double longitude;
  final double? speed;
  final double? accuracy;
  final int lastUpdated;
  final int lastConnection;

  DriverModel({
    required this.uid,
    required this.name,
    required this.trackingId,
    required this.status,
    required this.sharingEnabled,
    required this.latitude,
    required this.longitude,
    this.speed,
    this.accuracy,
    required this.lastUpdated,
    required this.lastConnection,
  });

  factory DriverModel.fromMap(Map<String, dynamic> map) {
    final lastLocation = map['lastLocation'] as Map? ?? {};
    return DriverModel(
      uid: map['uid'] ?? '',
      name: map['name'] ?? 'Unknown',
      trackingId: map['trackingId'] ?? '---',
      status: map['status'] ?? 'offline',
      sharingEnabled: map['sharingEnabled'] ?? false,
      latitude: (lastLocation['latitude'] ?? 0).toDouble(),
      longitude: (lastLocation['longitude'] ?? 0).toDouble(),
      speed: lastLocation['speed']?.toDouble(),
      accuracy: lastLocation['accuracy']?.toDouble(),
      lastUpdated: map['lastUpdated'] ?? 0,
      lastConnection: map['lastConnection'] ?? 0,
    );
  }
}
