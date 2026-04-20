import 'package:flutter/material.dart';

import '../services/api_client.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiClient();

  List<Map<String, dynamic>> _reports = [];
  bool _loading = true;
  String? _error;

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
      final data = await _api.fetchReports(pageSize: 20);
      final items = (data['items'] as List<dynamic>? ?? <dynamic>[])
          .cast<Map<String, dynamic>>();
      setState(() {
        _reports = items;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not load reports. Pull to retry.';
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

  String _timeAgo(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '';
    try {
      final date = DateTime.parse(isoDate);
      final diff = DateTime.now().toUtc().difference(date);
      if (diff.inMinutes < 1) return 'just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 30) return '${diff.inDays}d ago';
      return '${(diff.inDays / 30).floor()}mo ago';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F4EF),
      appBar: AppBar(
        title: const Text('Nearby Issues'),
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
                                  Icon(Icons.check_circle_outline, size: 56, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No reports nearby',
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Pull down to refresh',
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
                          final category = _formatCategory(r['category_final'] as String?);
                          final status = (r['status'] as String?) ?? 'open';
                          final locality = (r['locality'] as String?) ?? '';
                          final createdAt = r['created_at'] as String?;

                          return Card(
                            elevation: 1,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              child: Row(
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
                                        const SizedBox(height: 4),
                                        if (locality.isNotEmpty)
                                          Text(
                                            locality,
                                            style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        if (createdAt != null) ...[
                                          const SizedBox(height: 2),
                                          Text(
                                            _timeAgo(createdAt),
                                            style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
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
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
