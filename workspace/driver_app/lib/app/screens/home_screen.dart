import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import '../services/location_service.dart';
import '../models/driver_model.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final LocationService _locationService = LocationService();
  final FirebaseDatabase _db = FirebaseDatabase.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  DriverModel? _driver;
  StreamSubscription? _driverSubscription;
  bool _isSharing = true;

  @override
  void initState() {
    super.initState();
    _loadDriverInfo();
  }

  Future<void> _loadDriverInfo() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;

    _driverSubscription = _db.ref('drivers/$uid').onValue.listen((event) {
      if (event.snapshot.value != null) {
        final data = Map<String, dynamic>.from(
          event.snapshot.value as Map,
        );
        data['uid'] = uid;
        final driver = DriverModel.fromMap(data);
        final sharingDisabledByAdmin = driver.status == 'sharing_disabled';
        setState(() {
          _driver = driver;
          _isSharing = _locationService.isTracking && !sharingDisabledByAdmin;
        });
        if (sharingDisabledByAdmin && _locationService.isTracking) {
          unawaited(_locationService.stopTracking());
        }
      }
    });
  }

  Future<void> _toggleSharing() async {
    if (_isSharing) {
      // Show confirmation dialog
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: const Color(0xFF151D2E),
          title: const Text('Disable Location Sharing?'),
          content: const Text(
            'Your location will no longer be shared with the fleet administrator.',
            style: TextStyle(color: Colors.grey),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Disable'),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        await _locationService.stopTracking();
        setState(() => _isSharing = false);
      }
    } else {
      await _locationService.startTracking();
      setState(() => _isSharing = true);
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF151D2E),
        title: const Text('Sign Out?'),
        content: const Text(
          'Location tracking will stop.',
          style: TextStyle(color: Colors.grey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _locationService.stopTracking();
      await _auth.signOut();
    }
  }

  @override
  void dispose() {
    _driverSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'TRACKX',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  IconButton(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout, color: Colors.grey),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Welcome, ${_driver?.name ?? 'Driver'}',
                style: const TextStyle(
                  fontSize: 18,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF1C2740),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Tracking ID: ${_driver?.trackingId ?? '---'}',
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    color: Color(0xFF00D4AA),
                    fontSize: 14,
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Status Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF151D2E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _isSharing
                        ? const Color(0xFF00D4AA).withOpacity(0.3)
                        : Colors.red.withOpacity(0.3),
                  ),
                ),
                child: Column(
                  children: [
                    // Status indicator
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isSharing
                            ? const Color(0xFF00D4AA).withOpacity(0.1)
                            : Colors.red.withOpacity(0.1),
                      ),
                      child: Icon(
                        _isSharing ? Icons.location_on : Icons.location_off,
                        size: 40,
                        color: _isSharing ? const Color(0xFF00D4AA) : Colors.red,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'LOCATION STATUS',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _isSharing ? '● LOCATION SHARING ACTIVE' : '● LOCATION SHARING PAUSED',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: _isSharing ? const Color(0xFF00D4AA) : Colors.red,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Info Cards
              Row(
                children: [
                  Expanded(
                    child: _InfoCard(
                      icon: Icons.gps_fixed,
                      label: 'GPS Status',
                      value: _locationService.isTracking ? 'Connected' : 'Inactive',
                      color: _locationService.isTracking ? const Color(0xFF00D4AA) : Colors.grey,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _InfoCard(
                      icon: Icons.wifi,
                      label: 'Internet',
                      value: _locationService.isConnected ? 'Connected' : 'Offline',
                      color: _locationService.isConnected ? const Color(0xFF00D4AA) : Colors.orange,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _InfoCard(
                      icon: Icons.update,
                      label: 'Last Updated',
                      value: _driver != null
                          ? _formatTime(_driver!.lastUpdated)
                          : '---',
                      color: const Color(0xFF5A7AB5),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _InfoCard(
                      icon: Icons.shield,
                      label: 'Permissions',
                      value: _locationService.isTracking ? 'Granted' : 'Required',
                      color: _locationService.isTracking ? const Color(0xFF00D4AA) : Colors.orange,
                    ),
                  ),
                ],
              ),

              const Spacer(),

              // Toggle Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _toggleSharing,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isSharing
                        ? Colors.red.withOpacity(0.1)
                        : const Color(0xFF00D4AA),
                    foregroundColor: _isSharing ? Colors.red : const Color(0xFF0A0E17),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _isSharing ? Icons.pause_circle : Icons.play_circle,
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isSharing ? 'Pause Location Sharing' : 'Resume Location Sharing',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(int timestamp) {
    final now = DateTime.now();
    final updated = DateTime.fromMillisecondsSinceEpoch(timestamp);
    final diff = now.difference(updated);
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return '${diff.inHours}h ago';
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _InfoCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF151D2E),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
