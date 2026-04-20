import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';

import '../models/report_models.dart';

class ApiClient {
  ApiClient({String? baseUrl})
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:8000'),
            connectTimeout: const Duration(seconds: 8),
            receiveTimeout: const Duration(seconds: 10),
          ),
        );

  final Dio _dio;

  // ── Media upload ──────────────────────────────────────────────────────

  Future<(String mediaKey, String uploadUrl)> createUploadUrl({required bool isVideo}) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/v1/media/upload-url',
      data: {
        'media_type': isVideo ? 'video' : 'image',
        'file_ext': isVideo ? 'mp4' : 'jpg',
      },
    );
    final data = response.data ?? {};
    return (data['media_key'] as String, data['upload_url'] as String);
  }

  Future<void> uploadBinary({required File file, required String uploadUrl, required bool isVideo}) async {
    final bytes = await file.readAsBytes();
    await _dio.putUri(
      Uri.parse(uploadUrl),
      data: Stream.fromIterable([bytes]),
      options: Options(
        contentType: isVideo ? 'video/mp4' : 'image/jpeg',
        headers: {'Content-Length': bytes.length},
      ),
    );
  }

  // ── Classify preview ──────────────────────────────────────────────────

  Future<ClassifyPreviewResult> classifyPreview({
    required File image,
    double? lat,
    double? lon,
  }) async {
    final raw = await image.readAsBytes();
    final base64Image = base64Encode(raw);

    final response = await _dio.post<Map<String, dynamic>>(
      '/v1/reports/classify-preview',
      data: {
        'image_base64': base64Image,
        if (lat != null) 'lat': lat,
        if (lon != null) 'lon': lon,
      },
    );

    return ClassifyPreviewResult.fromJson(response.data ?? {});
  }

  // ── Submit report ─────────────────────────────────────────────────────

  Future<SubmitResult> submitReport({
    required double lat,
    required double lon,
    required CivicCategory category,
    required String deviceId,
    required List<String> mediaKeys,
    required DateTime capturedAt,
    double? gpsAccuracyM,
    String? manualIssueLabel,
    String? description,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/v1/reports',
      data: {
        'lat': lat,
        'lon': lon,
        'category_final': category.wireValue,
        'capture_origin': 'camera',
        'captured_at': capturedAt.toUtc().toIso8601String(),
        if (gpsAccuracyM != null) 'gps_accuracy_m': gpsAccuracyM,
        if (manualIssueLabel != null && manualIssueLabel.trim().isNotEmpty) 'manual_issue_label': manualIssueLabel,
        'description_user': description,
        'media_keys': mediaKeys,
        'device_id': deviceId,
      },
    );
    return SubmitResult.fromJson(response.data ?? {});
  }

  Future<void> submitQueuedPayload(Map<String, dynamic> payload) async {
    await _dio.post('/v1/reports', data: payload);
  }

  // ── Fetch reports (list) ──────────────────────────────────────────────

  /// Returns the JSON response body as a Map.
  /// Keys typically include `items` (List) and pagination metadata.
  Future<Map<String, dynamic>> fetchReports({
    String? deviceId,
    int pageSize = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page_size': pageSize,
    };
    if (deviceId != null && deviceId.isNotEmpty) {
      queryParams['device_id'] = deviceId;
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '/v1/reports',
      queryParameters: queryParams,
    );
    return response.data ?? {};
  }

  // ── Fetch single report detail ────────────────────────────────────────

  Future<Map<String, dynamic>> fetchReportDetail(String publicId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/v1/reports/$publicId',
    );
    return response.data ?? {};
  }

  // ── Check-in on a report ──────────────────────────────────────────────

  Future<Map<String, dynamic>> checkin({
    required String publicId,
    required String deviceId,
    required double lat,
    required double lon,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/v1/reports/$publicId/checkin',
      data: {
        'device_id': deviceId,
        'lat': lat,
        'lon': lon,
      },
    );
    return response.data ?? {};
  }
}
