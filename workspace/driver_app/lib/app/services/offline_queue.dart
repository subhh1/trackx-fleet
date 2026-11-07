import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineQueue {
  static const String _storageKey = 'trackx_offline_queue';
  List<Map<String, dynamic>> _pendingRecords = [];

  OfflineQueue() {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_storageKey);
    if (stored != null) {
      final List<dynamic> decoded = jsonDecode(stored);
      _pendingRecords = decoded.cast<Map<String, dynamic>>();
    }
  }

  Future<void> _saveToStorage() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(_pendingRecords));
  }

  /// Add a location record to the offline queue
  Future<void> enqueue(Map<String, dynamic> record) async {
    _pendingRecords.add(record);
    // Keep max 500 records to prevent storage overflow
    if (_pendingRecords.length > 500) {
      _pendingRecords = _pendingRecords.sublist(_pendingRecords.length - 500);
    }
    await _saveToStorage();
  }

  /// Get all pending records
  Future<List<Map<String, dynamic>>> getPendingRecords() async {
    return List.from(_pendingRecords);
  }

  /// Clear all processed records
  Future<void> clearProcessed() async {
    _pendingRecords.clear();
    await _saveToStorage();
  }

  /// Get count of pending records
  int get pendingCount => _pendingRecords.length;
}
