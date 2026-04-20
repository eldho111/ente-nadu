import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class PendingReport {
  const PendingReport({required this.payload});

  final Map<String, dynamic> payload;

  Map<String, dynamic> toJson() => payload;

  factory PendingReport.fromJson(Map<String, dynamic> json) {
    return PendingReport(payload: json);
  }
}

class OfflineQueue {
  static const _storageKey = 'pending_reports_v1';

  Future<void> enqueue(PendingReport report) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getStringList(_storageKey) ?? <String>[];
    existing.add(jsonEncode(report.toJson()));
    await prefs.setStringList(_storageKey, existing);
  }

  Future<List<PendingReport>> readAll() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getStringList(_storageKey) ?? <String>[];
    return existing
        .map((raw) => PendingReport.fromJson(jsonDecode(raw) as Map<String, dynamic>))
        .toList();
  }

  Future<void> replaceAll(List<PendingReport> items) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = items.map((item) => jsonEncode(item.toJson())).toList();
    await prefs.setStringList(_storageKey, raw);
  }
}