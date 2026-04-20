import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../models/report_models.dart';
import '../services/api_client.dart';
import '../services/location_service.dart';
import '../services/offline_queue.dart';
import '../utils/device_identity.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _api = ApiClient();
  final _picker = ImagePicker();
  final _locationService = LocationService();
  final _queue = OfflineQueue();
  final _deviceIdentity = DeviceIdentity();
  final _descriptionController = TextEditingController();
  final _manualIssueController = TextEditingController();

  File? _image;
  double? _lat;
  double? _lon;
  double? _gpsAccuracyM;
  DateTime? _capturedAt;
  bool _isBusy = false;
  ClassifyPreviewResult? _preview;
  CivicCategory? _selectedCategory;
  SubmitResult? _submitResult;
  String _locale = 'en';
  String _status = 'Capture an issue and submit in under 20 seconds.';

  static const Map<String, Map<String, String>> _copy = {
    'en': {
      'appTitle': 'Civic Pulse',
      'report20': 'Report in 20 Seconds',
      'capturePhoto': 'Capture Photo',
      'confirmCategory': 'Confirm Category',
      'optionalNote': 'Optional note',
      'submit': 'Submit Report',
      'submitting': 'Submitting...',
      'submissionDone': 'Submission complete',
      'language': 'Language',
    },
    'kn': {
      'appTitle': 'Civic Pulse',
      'report20': '20 ಸೆಕೆಂಡಿನಲ್ಲಿ ವರದಿ',
      'capturePhoto': 'ಫೋಟೋ ತೆಗೆದು',
      'confirmCategory': 'ವರ್ಗ ದೃಢೀಕರಿಸಿ',
      'optionalNote': 'ಐಚ್ಛಿಕ ಟಿಪ್ಪಣಿ',
      'submit': 'ವರದಿ ಸಲ್ಲಿಸಿ',
      'submitting': 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...',
      'submissionDone': 'ಸಲ್ಲಿಕೆ ಪೂರ್ಣಗೊಂಡಿದೆ',
      'language': 'ಭಾಷೆ',
    },
    'ml': {
      'appTitle': 'Civic Pulse',
      'report20': '20 സെക്കൻഡിൽ റിപ്പോർട്ട്',
      'capturePhoto': 'ഫോട്ടോ എടുക്കുക',
      'confirmCategory': 'വിഭാഗം സ്ഥിരീകരിക്കുക',
      'optionalNote': 'ഐച്ഛിക കുറിപ്പ്',
      'submit': 'റിപ്പോർട്ട് സമർപ്പിക്കുക',
      'submitting': 'സമർപ്പിക്കുന്നു...',
      'submissionDone': 'സമർപ്പണം പൂർത്തിയായി',
      'language': 'ഭാഷ',
    },
  };

  String _t(String key) => _copy[_locale]?[key] ?? _copy['en']![key] ?? key;

  @override
  void initState() {
    super.initState();
    _flushQueue();
  }

  Future<void> _flushQueue() async {
    final queued = await _queue.readAll();
    if (queued.isEmpty) return;

    final remaining = <PendingReport>[];
    for (final item in queued) {
      try {
        final payload = item.payload;
        if (payload.containsKey('local_image_path')) {
          final localPath = payload['local_image_path'] as String?;
          if (localPath == null) {
            continue;
          }
          final file = File(localPath);
          if (!await file.exists()) {
            continue;
          }
          final upload = await _api.createUploadUrl(isVideo: false);
          await _api.uploadBinary(file: file, uploadUrl: upload.$2, isVideo: false);
          final submitPayload = {
            'lat': payload['lat'],
            'lon': payload['lon'],
            'category_final': payload['category_final'],
            'capture_origin': payload['capture_origin'] ?? 'camera',
            'captured_at': payload['captured_at'] ?? DateTime.now().toUtc().toIso8601String(),
            if (payload['gps_accuracy_m'] != null) 'gps_accuracy_m': payload['gps_accuracy_m'],
            if (payload['manual_issue_label'] != null) 'manual_issue_label': payload['manual_issue_label'],
            'description_user': payload['description_user'],
            'media_keys': [upload.$1],
            'device_id': payload['device_id'],
          };
          await _api.submitQueuedPayload(submitPayload);
        } else {
          await _api.submitQueuedPayload(payload);
        }
      } catch (_) {
        remaining.add(item);
      }
    }
    await _queue.replaceAll(remaining);
  }

  Future<void> _captureImage() async {
    final picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 75);
    if (picked == null) return;

    setState(() {
      _image = File(picked.path);
      _capturedAt = DateTime.now().toUtc();
      _preview = null;
      _selectedCategory = null;
      _submitResult = null;
      _manualIssueController.clear();
      _status = 'Photo captured. Fetching location and category suggestions...';
    });

    await _captureLocation();
    await _runPreview();
  }

  Future<void> _captureLocation() async {
    try {
      final position = await _locationService.getCurrentPosition();
      setState(() {
        _lat = position.latitude;
        _lon = position.longitude;
        _gpsAccuracyM = position.accuracy;
      });
    } catch (_) {
      setState(() {
        _status = 'Location unavailable. You can still submit with last known defaults.';
      });
    }
  }

  Future<void> _runPreview() async {
    final image = _image;
    if (image == null) return;

    setState(() => _isBusy = true);
    try {
      final preview = await _api.classifyPreview(image: image, lat: _lat, lon: _lon);
      final requireManualConfirm = preview.confidence < 0.72;
      setState(() {
        _preview = preview;
        _selectedCategory = requireManualConfirm
            ? null
            : (preview.suggestions.isNotEmpty ? preview.suggestions.first.category : CivicCategory.pothole);
        _status = requireManualConfirm
            ? 'Low model confidence. Please confirm category manually.'
            : preview.quickSummary;
      });
    } catch (_) {
      setState(() {
        _status = 'Classification preview failed. Please choose category manually.';
        _selectedCategory = CivicCategory.pothole;
      });
    } finally {
      setState(() => _isBusy = false);
    }
  }

  Future<void> _submit() async {
    final image = _image;
    final category = _selectedCategory;
    if (image == null || category == null) {
      setState(() => _status = 'Capture image and confirm category first.');
      return;
    }
    if (category == CivicCategory.other && _manualIssueController.text.trim().isEmpty) {
      setState(() => _status = 'Please add a short manual issue label for "Other".');
      return;
    }

    final lat = _lat ?? 12.9716;
    final lon = _lon ?? 77.5946;

    setState(() => _isBusy = true);
    try {
      final upload = await _api.createUploadUrl(isVideo: false);
      await _api.uploadBinary(file: image, uploadUrl: upload.$2, isVideo: false);

      final deviceId = await _deviceIdentity.getOrCreate();
      final submitResult = await _api.submitReport(
        lat: lat,
        lon: lon,
        category: category,
        deviceId: deviceId,
        mediaKeys: [upload.$1],
        capturedAt: _capturedAt ?? DateTime.now().toUtc(),
        gpsAccuracyM: _gpsAccuracyM,
        manualIssueLabel: category == CivicCategory.other ? _manualIssueController.text.trim() : null,
        description: _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
      );

      setState(() {
        _submitResult = submitResult;
        _status = 'Report submitted successfully.';
      });
    } catch (_) {
      final deviceId = await _deviceIdentity.getOrCreate();
      final appDir = await getApplicationDocumentsDirectory();
      final queuedPath = '${appDir.path}/queued_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final queuedFile = await image.copy(queuedPath);
      final payload = {
        'lat': lat,
        'lon': lon,
        'category_final': category.wireValue,
        'capture_origin': 'camera',
        'captured_at': (_capturedAt ?? DateTime.now().toUtc()).toIso8601String(),
        if (_gpsAccuracyM != null) 'gps_accuracy_m': _gpsAccuracyM,
        if (category == CivicCategory.other) 'manual_issue_label': _manualIssueController.text.trim(),
        'description_user': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
        'local_image_path': queuedFile.path,
        'device_id': deviceId,
      };
      await _queue.enqueue(PendingReport(payload: payload));
      setState(() {
        _status = 'Network issue: report queued for retry.';
      });
    } finally {
      setState(() => _isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F4EF),
      appBar: AppBar(
        title: Text(_t('appTitle')),
        backgroundColor: const Color(0xFF0A6A52),
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _t('report20'),
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          '${_t('language')}: ',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        DropdownButton<String>(
                          value: _locale,
                          items: const [
                            DropdownMenuItem(value: 'en', child: Text('English')),
                            DropdownMenuItem(value: 'kn', child: Text('Kannada')),
                            DropdownMenuItem(value: 'ml', child: Text('Malayalam')),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() {
                              _locale = value;
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(_status),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: _isBusy ? null : _captureImage,
                      icon: const Icon(Icons.camera_alt_outlined),
                      label: Text(_t('capturePhoto')),
                    ),
                    if (_image != null) ...[
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(_image!, height: 220, fit: BoxFit.cover),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_t('confirmCategory'), style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<CivicCategory>(
                      value: _selectedCategory,
                      items: CivicCategory.values
                          .map(
                            (cat) => DropdownMenuItem<CivicCategory>(
                              value: cat,
                              child: Text(cat.localizedLabel(_locale)),
                            ),
                          )
                          .toList(),
                      onChanged: _isBusy
                          ? null
                          : (value) {
                              setState(() {
                                _selectedCategory = value;
                              });
                            },
                    ),
                    const SizedBox(height: 8),
                    if (_preview != null)
                      Text('Model confidence: ${_preview!.confidence.toStringAsFixed(2)} (threshold 0.72)'),
                    if (_preview != null && _preview!.suggestions.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _preview!.suggestions
                            .map((s) => Chip(label: Text('${s.category.label} ${(s.confidence * 100).round()}%')))
                            .toList(),
                      ),
                    ],
                    if (_selectedCategory == CivicCategory.other) ...[
                      const SizedBox(height: 10),
                      TextField(
                        controller: _manualIssueController,
                        maxLines: 1,
                        maxLength: 120,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          hintText: 'Manual issue label (required for Other)',
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    TextField(
                      controller: _descriptionController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        border: const OutlineInputBorder(),
                        hintText: _t('optionalNote'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _isBusy ? null : _submit,
                      icon: const Icon(Icons.send),
                      label: Text(_isBusy ? _t('submitting') : _t('submit')),
                    ),
                  ],
                ),
              ),
            ),
            if (_submitResult != null) ...[
              const SizedBox(height: 12),
              Card(
                color: const Color(0xFFE6F6EF),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_t('submissionDone'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text('Report ID: ${_submitResult!.publicId}'),
                      if (_submitResult!.tokenNo.isNotEmpty) Text('Token: ${_submitResult!.tokenNo}'),
                      Text('Share: ${_submitResult!.shareUrl}'),
                      Text('Notify email: ${_submitResult!.emailNotifyUrl}'),
                      Text('Notify WhatsApp: ${_submitResult!.whatsappNotifyUrl}'),
                    ],
                  ),
                ),
              )
            ]
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _manualIssueController.dispose();
    super.dispose();
  }
}
