import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class BackgroundService {
  static final FlutterBackgroundService _service = FlutterBackgroundService();

  static Future<void> initialize() async {
    final service = _service;

    // Configure notification for foreground service
    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'trackx_tracking',
        foregroundServiceNotificationId: 888,
        foregroundServiceNotificationTitle: 'TRACKX Active',
        foregroundServiceNotificationText: 'Location sharing is active',
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  static Future<void> start() async {
    final isRunning = await _service.isRunning();
    if (!isRunning) {
      await _service.startService();
    }
  }

  static Future<void> stop() async {
    _service.invoke('stop');
  }

  @pragma('vm:entry-point')
  static void onStart(ServiceInstance service) async {
    // Listen for stop command
    service.on('stop').listen((event) {
      service.stopSelf();
    });

    // Keep the service alive
    // The actual location tracking is handled by LocationService
    // This background service just ensures the process stays alive
  }

  @pragma('vm:entry-point')
  static Future<bool> onIosBackground(ServiceInstance service) async {
    // Return true to allow iOS background execution
    return true;
  }
}
