import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/location_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final MobileScannerController _cameraController = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );
  
  bool _isProcessing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startScanner();
  }

  Future<void> _startScanner() async {
    try {
      // mobile_scanner v3.5+ uses onDetect via the widget, not startScanning
      await _cameraController.start();
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Camera access required for QR scanning');
      }
    }
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty || barcodes.first.rawValue == null) return;
    
    final String? rawValue = barcodes.first.rawValue;
    if (rawValue == null) return;
    
    _isProcessing = true;
    
    try {
      final data = jsonDecode(rawValue);
      
      if (data['type'] != 'TRACKX_REGISTRATION') {
        if (mounted) {
          setState(() => _error = 'Invalid QR code');
        }
        _isProcessing = false;
        return;
      }

      // Create anonymous auth account FIRST (needed for completeRegistration)
      await FirebaseAuth.instance.signInAnonymously();
      // Validate token with Firebase
      final result = await FirebaseFunctions.instance
          .httpsCallable('validateRegistrationToken')
          .call({'token': data['token']});

      if (result.data['valid'] == true) {
        // Complete registration
        await FirebaseFunctions.instance
            .httpsCallable('completeRegistration')
            .call({
            'tokenId': result.data['tokenId'],
        });

        // Start location tracking
        final locationService = LocationService();
        await locationService.initialize();
        await locationService.startTracking();

        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Registration failed: ${e.toString()}');
      }
    } finally {
      _isProcessing = false;
    }
  }

  @override
  void dispose() {
    _cameraController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(Icons.qr_code_scanner, size: 48, color: Color(0xFF00D4AA)),
                  SizedBox(height: 16),
                  Text(
                    'TRACKX',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Scan registration QR code',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  MobileScanner(
                    controller: _cameraController,
                    onDetect: _onDetect,
                    overlay: QRScannerOverlay(),
                  ),
                  if (_isProcessing)
                    Container(
                      color: Colors.black54,
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(color: Color(0xFF00D4AA)),
                            SizedBox(height: 16),
                            Text('Registering...', style: TextStyle(color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
                  if (_error != null)
                    Positioned(
                      bottom: 24,
                      left: 24,
                      right: 24,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade900,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.white),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class QRScannerOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _OverlayPainter(),
      child: Center(
        child: Container(
          width: 250,
          height: 250,
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFF00D4AA), width: 2),
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}

class _OverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black54
      ..style = PaintingStyle.fill;

    final rect = Rect.fromLTWH(
      (size.width - 250) / 2,
      (size.height - 250) / 2,
      250,
      250,
    );

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(16)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
