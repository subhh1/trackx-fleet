import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/driver_model.dart';
import '../services/offline_queue.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  final FirebaseDatabase _db = FirebaseDatabase.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final OfflineQueue _offlineQueue = OfflineQueue();
  
  bool _isTracking = false;
  bool _isSharingEnabled = true;
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  bool _isConnected = true;
  Timer? _stationaryTimer;
  Position? _lastPosition;
  DateTime? _lastUpdateTime;
  bool _isSending = false; // Prevent concurrent sends

  // Notification plugin
  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool get isTracking => _isTracking;
  bool get isSharingEnabled => _isSharingEnabled;
  bool get isConnected => _isConnected;

  /// Initialize location service
  Future<void> initialize() async {
    // Setup notifications
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initSettings =
        InitializationSettings(android: androidSettings);
    await _notifications.initialize(initSettings);

    // Monitor connectivity
    _connectivitySubscription =
        Connectivity().onConnectivityChanged.listen((result) {
      _isConnected = (result != ConnectivityResult.none);
      if (_isConnected) {
        _syncOfflineQueue();
      }
    });

    // Check initial connectivity
    final ConnectivityResult connectivityResult = 
        await Connectivity().checkConnectivity();
    _isConnected = (connectivityResult != ConnectivityResult.none);
  }

  /// Request precise location and background permissions
  Future<bool> requestPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    // Request notification permission on Android 13+ for Foreground Service
    if (Platform.isAndroid) {
      try {
        await _notifications
            .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin>()
            ?.requestNotificationsPermission();
      } catch (e) {
        debugPrint('Notification permission error: $e');
      }
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }

    if (permission == LocationPermission.deniedForever) return false;

    // Request background location on Android for 24/7 forever tracking
    if (Platform.isAndroid) {
      LocationPermission bgPermission = await Geolocator.checkPermission();
      if (bgPermission != LocationPermission.always) {
        bgPermission = await Geolocator.requestPermission();
      }
    }

    return true;
  }

  /// Start continuous location tracking
  Future<void> startTracking() async {
    if (_isTracking) return;

    final hasPermission = await requestPermissions();
    if (!hasPermission) {
      throw Exception('Precise and Background Location permissions not granted');
    }

    try {
      final uid = _auth.currentUser?.uid;
      if (uid != null) {
        await FirebaseFirestore.instance.collection('drivers').doc(uid).set({
          'sharingEnabled': true,
          'status': 'online',
          'lastConnection': DateTime.now().millisecondsSinceEpoch,
        }, SetOptions(merge: true));
      }
    } catch (e) {
      debugPrint('Firestore status update error: $e');
    }

    _isTracking = true;
    _isSharingEnabled = true;

    // Show persistent notification
    await _showTrackingNotification();

    // Start listening to position updates every 5 seconds
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0, // Stream all updates regardless of distance
      ),
    ).listen(_onPositionUpdate);

    // Periodic 5-second interval timer for guaranteed updates
    _stationaryTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _sendStationaryUpdate(),
    );

    // Sync any offline records
    if (_isConnected) {
      await _syncOfflineQueue();
    }
  }

  /// Stop location tracking
  Future<void> stopTracking() async {
    _isTracking = false;
    _isSharingEnabled = false;

    await _positionSubscription?.cancel();
    _positionSubscription = null;

    _stationaryTimer?.cancel();
    _stationaryTimer = null;

    await _cancelNotification();

    // Update Firebase status
    await _updateDriverStatus('sharing_disabled');
  }

  /// Handle position updates
  void _onPositionUpdate(Position position) {
    if (!_isSharingEnabled) return;

    _lastPosition = position;

    // Throttle updates: minimum 5 seconds between updates
    if (_lastUpdateTime != null &&
        DateTime.now().difference(_lastUpdateTime!) < const Duration(seconds: 5)) {
      return;
    }

    _lastUpdateTime = DateTime.now();
    // Fire and forget - don't block the stream listener
    _sendLocationToServer(position);
  }

  /// Send periodic update every 5 seconds (moving or stationary)
  void _sendStationaryUpdate() {
    if (!_isTracking || !_isSharingEnabled) return;

    // Send every 5 seconds
    if (_lastUpdateTime != null &&
        DateTime.now().difference(_lastUpdateTime!) < const Duration(seconds: 5)) {
      return;
    }

    if (_lastPosition != null) {
      _sendLocationToServer(_lastPosition!);
    }
  }

  /// Send location to Firebase
  Future<void> _sendLocationToServer(Position position) async {
    // Prevent concurrent sends
    if (_isSending) return;
    _isSending = true;

    final uid = _auth.currentUser?.uid;
    if (uid == null) {
      _isSending = false;
      return;
    }

    final now = DateTime.now().millisecondsSinceEpoch;
    final locationData = {
      'latitude': position.latitude,
      'longitude': position.longitude,
      'speed': position.speed * 3.6, // Convert m/s to km/h
      'accuracy': position.accuracy,
      'timestamp': now,
    };

    if (_isConnected) {
      try {
        // Update Cloud Firestore
        final firestore = FirebaseFirestore.instance;
        await firestore.collection('drivers').doc(uid).set({
          'lastLocation': locationData,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'speed': position.speed * 3.6,
          'accuracy': position.accuracy,
          'lastUpdated': now,
          'lastConnection': now,
          'status': 'online',
          'sharingEnabled': true,
        }, SetOptions(merge: true));

        await firestore.collection('locationHistory').add({
          'uid': uid,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'speed': position.speed * 3.6,
          'accuracy': position.accuracy,
          'timestamp': now,
        });

        _lastUpdateTime = DateTime.now();
      } catch (e) {
        // Queue for later
        await _offlineQueue.enqueue(locationData);
      }
    } else {
      // Queue for later
      await _offlineQueue.enqueue(locationData);
    }

    _isSending = false;
  }

  /// Sync offline queue when connection restored
  Future<void> _syncOfflineQueue() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;

    try {
      if (!_isSharingEnabled) {
        await _offlineQueue.clearProcessed();
        await _updateDriverStatus('sharing_disabled');
        return;
      }

      final driverSnapshot = await _db.ref('drivers/$uid').get();
      if (driverSnapshot.child('sharingEnabled').value != true ||
          driverSnapshot.child('status').value == 'sharing_disabled') {
        _isSharingEnabled = false;
        await _offlineQueue.clearProcessed();
        await stopTracking();
        return;
      }

      final records = await _offlineQueue.getPendingRecords();
      if (records.isEmpty) return;

      final batch = <String, dynamic>{};
      for (final record in records) {
        final key = 'loc_${record['timestamp']}';
        batch['locationHistory/$uid/$key'] = record;
      }

      await _db.ref().update(batch);
      final latest = records.last;
      await _db.ref('drivers/$uid').update({
        'lastLocation': latest,
        'lastUpdated': latest['timestamp'],
        'lastConnection': DateTime.now().millisecondsSinceEpoch,
        'status': 'online',
        'sharingEnabled': true,
      });
      await _offlineQueue.clearProcessed();
    } catch (e) {
      debugPrint('Unable to sync offline location data; pending records remain queued: $e');
    }
  }

  /// Update driver status in Firebase
  Future<void> _updateDriverStatus(String status) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null || !_isConnected) return;

    final driverSnapshot = await _db.ref('drivers/$uid').get();
    if (driverSnapshot.child('sharingEnabled').value != true) return;

    await _db.ref('drivers/$uid').update({
      'status': status,
      'sharingEnabled': _isSharingEnabled,
      'lastUpdated': DateTime.now().millisecondsSinceEpoch,
    });
  }

  /// Show persistent tracking notification
  Future<void> _showTrackingNotification() async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'trackx_tracking',
      'TRACKX Location Tracking',
      channelDescription: 'Shows when TRACKX is sharing your location',
      importance: Importance.low,
      priority: Priority.low,
      ongoing: true,
      autoCancel: false,
      icon: '@mipmap/ic_launcher',
    );

    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
    );

    await _notifications.show(
      0,
      'TRACKX Active',
      'Location sharing is active',
      details,
    );
  }

  /// Cancel tracking notification
  Future<void> _cancelNotification() async {
    await _notifications.cancel(0);
  }

  /// Dispose resources
  void dispose() {
    _positionSubscription?.cancel();
    _connectivitySubscription?.cancel();
    _stationaryTimer?.cancel();
  }
}
