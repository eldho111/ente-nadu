import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/location_service.dart';
import '../utils/device_identity.dart';

class TrackScreen extends StatefulWidget {
  const TrackScreen({super.key});

  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen> {
  final _api = ApiClient();
  final _deviceIdentity = DeviceIdentity();
  final _locationService = LocationService();

  List<Map<String, dynamic>> _reports = [];
  bool _loading = true;
  String? _error;
  String? _deviceId;

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      _deviceId ??= await _deviceIdentity.getOrCreate();
      final data = await _api.fetchReports(deviceId: _deviceId, pageSize: 50);
      final items = (data['items'] as List<dynamic>? ?? <dynamic>[])
          .cast<Map<String, dynamic>>();
      setState(() {
        _reports = items;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not load your reports. Pull to retry.';
        _loading = false;
      });
    }
  }

  String _formatCategory(String? raw) {
    if (raw == null || raw.isEmpty) return 'Unknown';
    return raw
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }

  Color _statusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'open':
        return Colors.orange;
      case 'in_progress':
      case 'acknowledged':
        return Colors.blue;
      case 'resolved':
        return Colors.green;
      case 'closed':
        return Colors.grey;
      default:
        return Colors.orange;
    }
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '';
    try {
      final date = DateTime.parse(isoDate).toLocal();
      final day = date.day.toString().padLeft(2, '0');
      final month = date.month.toString().padLeft(2, '0');
      final year = date.year;
      final hour = date.hour.toString().padLeft(2, '0');
      final minute = date.minute.toString().padLeft(2, '0');
      return '$day/$month/$year $hour:$minute';
    } catch (_) {
      return '';
    }
  }

  Future<void> _showDetailSheet(Map<String, dynamic> report) async {
    final publicId = report['public_id'] as String? ?? '';
    Map<String, dynamic>? detail;

    // Try to fetch full detail; fall back to the list item data.
    try {
      detail = await _api.fetchReportDetail(publicId);
    } catch (_) {
      detail = report;
    }

    if (!mounted) return;

    final description = (detail?['description_user'] as String?) ?? 'No description provided.';
    final checkinCount = detail?['checkin_count'] ?? detail?['check_in_count'] ?? 0;
    final lastCheckin = detail?['last_checkin'] ?? detail?['last_check_in'];

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _formatCategory(report['category_final'] as String?),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'ID: $publicId',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 12),
              Text(
                'Description',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700),
              ),
              const SizedBox(height: 4),
              Text(description, style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 12),
              Row(
                children: [
                  _DetailChip(
                    icon: Icons.how_to_vote,
                    label: 'Check-ins: $checkinCount',
                  ),
                  const SizedBox(width: 12),
                  if (lastCheckin != null)
                    _DetailChip(
                      icon: Icons.access_time,
                      label: 'Last: ${_formatDate(lastCheckin as String?)}',
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _checkin(Map<String, dynamic> report) async {
    final publicId = report['public_id'] as String? ?? '';
    if (publicId.isEmpty) return;

    try {
      _deviceId ??= await _deviceIdentity.getOrCreate();

      double lat = 12.9716;
      double lon = 77.5946;
      try {
        final position = await _locationService.getCurrentPosition();
        lat = position.latitude;
        lon = position.longitude;
      } catch (_) {
        // Use defaults if location is unavailable.
      }

      await _api.checkin(
        publicId: publicId,
        deviceId: _deviceId!,
        lat: lat,
        lon: lon,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Check-in recorded successfully.'),
          backgroundColor: Color(0xFF0A6A52),
          behavior: SnackBarBehavior.floating,
        ),
      );

      // Refresh to reflect the updated check-in count.
      _loadReports();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Check-in failed: ${e.toString().length > 80 ? 'network error' : e}'),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F4EF),
      appBar: AppBar(
        title: const Text('Track Reports'),
        backgroundColor: const Color(0xFF0A6A52),
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? RefreshIndicator(
                  onRefresh: _loadReports,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(
                        height: MediaQuery.of(context).size.height * 0.6,
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.cloud_off, size: 56, color: Colors.grey.shade400),
                              const SizedBox(height: 12),
                              Text(
                                _error!,
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 15),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : _reports.isEmpty
                  ? RefreshIndicator(
                      onRefresh: _loadReports,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          SizedBox(
                            height: MediaQuery.of(context).size.height * 0.6,
                            child: Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.inbox_outlined, size: 56, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No reports submitted yet',
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Reports you submit will appear here',
                                    style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadReports,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _reports.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final r = _reports[index];
                          final publicId = (r['public_id'] as String?) ?? '';
                          final category = _formatCategory(r['category_final'] as String?);
                          final status = (r['status'] as String?) ?? 'open';
                          final createdAt = r['created_at'] as String?;

                          return Card(
                            elevation: 1,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => _showDetailSheet(r),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                category,
                                                style: theme.textTheme.titleSmall?.copyWith(
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                publicId,
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.grey.shade500,
                                                  fontFamily: 'monospace',
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Chip(
                                          label: Text(
                                            status.replaceAll('_', ' '),
                                            style: const TextStyle(fontSize: 11, color: Colors.white),
                                          ),
                                          backgroundColor: _statusColor(status),
                                          padding: EdgeInsets.zero,
                                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        if (createdAt != null)
                                          Text(
                                            _formatDate(createdAt),
                                            style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                                          ),
                                        const Spacer(),
                                        SizedBox(
                                          height: 32,
                                          child: OutlinedButton.icon(
                                            onPressed: () => _checkin(r),
                                            icon: const Icon(Icons.how_to_vote, size: 16),
                                            label: const Text('Check In', style: TextStyle(fontSize: 12)),
                                            style: OutlinedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 10),
                                              side: BorderSide(color: theme.colorScheme.primary),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

/// Small chip widget used in the detail bottom sheet.
class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade600),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
        ],
      ),
    );
  }
}
