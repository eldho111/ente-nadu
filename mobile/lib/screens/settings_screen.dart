import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const _languagePrefKey = 'app_language';

  String _selectedLanguage = 'en';
  bool _loaded = false;

  static const Map<String, String> _languageLabels = {
    'en': 'English',
    'kn': 'Kannada',
    'ml': 'Malayalam',
  };

  @override
  void initState() {
    super.initState();
    _loadPreference();
  }

  Future<void> _loadPreference() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _selectedLanguage = prefs.getString(_languagePrefKey) ?? 'en';
      _loaded = true;
    });
  }

  Future<void> _setLanguage(String code) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_languagePrefKey, code);
    setState(() {
      _selectedLanguage = code;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F4EF),
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: const Color(0xFF0A6A52),
        foregroundColor: Colors.white,
      ),
      body: _loaded
          ? ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Language ──────────────────────────────────────────────
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Language',
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Select your preferred language. Full localisation support is coming soon.',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 12),
                        ..._languageLabels.entries.map((entry) {
                          return RadioListTile<String>(
                            title: Text(entry.value),
                            value: entry.key,
                            groupValue: _selectedLanguage,
                            onChanged: (value) {
                              if (value != null) _setLanguage(value);
                            },
                            contentPadding: EdgeInsets.zero,
                            dense: true,
                          );
                        }),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // ── About ────────────────────────────────────────────────
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'About',
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Civic Pulse',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Version 1.0.0',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Report civic issues in Bangalore quickly and track their resolution. '
                          'Snap a photo, confirm the category, and submit in under 20 seconds.',
                          style: TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // ── Install tip ──────────────────────────────────────────
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  color: const Color(0xFFE6F6EF),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.install_mobile, color: theme.colorScheme.primary),
                            const SizedBox(width: 8),
                            Text(
                              'Install as App',
                              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Using the web version? You can install Civic Pulse as a Progressive Web App (PWA) '
                          'for a native-like experience. Open the browser menu and tap '
                          '"Add to Home Screen" or "Install App".',
                          style: TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : const Center(child: CircularProgressIndicator()),
    );
  }
}
