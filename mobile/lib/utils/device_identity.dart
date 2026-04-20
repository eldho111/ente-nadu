import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class DeviceIdentity {
  static const _key = 'device_id_v1';
  static final _uuid = Uuid();

  Future<String> getOrCreate() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_key);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }
    final value = _uuid.v4();
    await prefs.setString(_key, value);
    return value;
  }
}