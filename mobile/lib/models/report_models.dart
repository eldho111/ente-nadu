enum CivicCategory {
  pothole,
  waterlogging,
  garbageDumping,
  streetlightOutage,
  trafficHotspot,
  illegalParking,
  footpathObstruction,
  signalMalfunction,
  openManhole,
  constructionDebris,
  other,
}

extension CivicCategoryWire on CivicCategory {
  String get wireValue {
    switch (this) {
      case CivicCategory.pothole:
        return 'pothole';
      case CivicCategory.waterlogging:
        return 'waterlogging';
      case CivicCategory.garbageDumping:
        return 'garbage_dumping';
      case CivicCategory.streetlightOutage:
        return 'streetlight_outage';
      case CivicCategory.trafficHotspot:
        return 'traffic_hotspot';
      case CivicCategory.illegalParking:
        return 'illegal_parking';
      case CivicCategory.footpathObstruction:
        return 'footpath_obstruction';
      case CivicCategory.signalMalfunction:
        return 'signal_malfunction';
      case CivicCategory.openManhole:
        return 'open_manhole';
      case CivicCategory.constructionDebris:
        return 'construction_debris';
      case CivicCategory.other:
        return 'other';
    }
  }

  String get label => wireValue.replaceAll('_', ' ');

  String localizedLabel(String locale) {
    switch (locale) {
      case 'kn':
        switch (this) {
          case CivicCategory.pothole:
            return 'ಗುಂಡಿ';
          case CivicCategory.waterlogging:
            return 'ನೀರು ನಿಲುವು';
          case CivicCategory.garbageDumping:
            return 'ಕಸ ಎಸೆಯುವುದು';
          case CivicCategory.streetlightOutage:
            return 'ಬತ್ತಿ ದೋಷ';
          case CivicCategory.trafficHotspot:
            return 'ಟ್ರಾಫಿಕ್ ಜಾಮ್ ಸ್ಥಳ';
          case CivicCategory.illegalParking:
            return 'ಅಕ್ರಮ ಪಾರ್ಕಿಂಗ್';
          case CivicCategory.footpathObstruction:
            return 'ಫುಟ್‌ಪಾತ್ ಅಡೆತಡೆ';
          case CivicCategory.signalMalfunction:
            return 'ಸಿಗ್ನಲ್ ದೋಷ';
          case CivicCategory.openManhole:
            return 'ತೆರೆದ ಮ್ಯಾನ್‌ಹೋಲ್';
          case CivicCategory.constructionDebris:
            return 'ನಿರ್ಮಾಣ ಅವಶೇಷ';
          case CivicCategory.other:
            return 'ಇತರೆ';
        }
      case 'ml':
        switch (this) {
          case CivicCategory.pothole:
            return 'കുഴി';
          case CivicCategory.waterlogging:
            return 'വെള്ളക്കെട്ട്';
          case CivicCategory.garbageDumping:
            return 'മാലിന്യ കൂമ്പാരം';
          case CivicCategory.streetlightOutage:
            return 'സ്റ്റ്രീറ്റ് ലൈറ്റ് തകരാർ';
          case CivicCategory.trafficHotspot:
            return 'ട്രാഫിക് ഹോട്ട്‌സ്‌പോട്ട്';
          case CivicCategory.illegalParking:
            return 'അനധികൃത പാർക്കിംഗ്';
          case CivicCategory.footpathObstruction:
            return 'ഫുട്പാത്ത് തടസം';
          case CivicCategory.signalMalfunction:
            return 'സിഗ്നൽ തകരാർ';
          case CivicCategory.openManhole:
            return 'തുറന്ന മാൻഹോൾ';
          case CivicCategory.constructionDebris:
            return 'നിർമാണ മാലിന്യം';
          case CivicCategory.other:
            return 'മറ്റ്';
        }
      default:
        return label;
    }
  }

  static CivicCategory fromWire(String value) {
    return CivicCategory.values.firstWhere(
      (item) => item.wireValue == value,
      orElse: () => CivicCategory.pothole,
    );
  }
}

class ClassifySuggestion {
  const ClassifySuggestion({required this.category, required this.confidence});

  final CivicCategory category;
  final double confidence;

  factory ClassifySuggestion.fromJson(Map<String, dynamic> json) {
    return ClassifySuggestion(
      category: CivicCategoryWire.fromWire(json['category'] as String),
      confidence: (json['confidence'] as num).toDouble(),
    );
  }
}

class ClassifyPreviewResult {
  const ClassifyPreviewResult({
    required this.suggestions,
    required this.confidence,
    required this.quickSummary,
  });

  final List<ClassifySuggestion> suggestions;
  final double confidence;
  final String quickSummary;

  factory ClassifyPreviewResult.fromJson(Map<String, dynamic> json) {
    final top = (json['top_3_categories'] as List<dynamic>? ?? <dynamic>[])
        .cast<Map<String, dynamic>>()
        .map(ClassifySuggestion.fromJson)
        .toList();
    return ClassifyPreviewResult(
      suggestions: top,
      confidence: (json['confidence'] as num).toDouble(),
      quickSummary: (json['quick_summary'] as String? ?? '').trim(),
    );
  }
}

class SubmitResult {
  const SubmitResult({
    required this.publicId,
    required this.tokenNo,
    required this.shareUrl,
    required this.emailNotifyUrl,
    required this.whatsappNotifyUrl,
  });

  final String publicId;
  final String tokenNo;
  final String shareUrl;
  final String emailNotifyUrl;
  final String whatsappNotifyUrl;

  factory SubmitResult.fromJson(Map<String, dynamic> json) {
    final notify = json['notify_actions'] as Map<String, dynamic>? ?? {};
    return SubmitResult(
      publicId: json['public_id'] as String,
      tokenNo: json['token_no'] as String? ?? '',
      shareUrl: json['share_url'] as String,
      emailNotifyUrl: notify['email'] as String? ?? '',
      whatsappNotifyUrl: notify['whatsapp'] as String? ?? '',
    );
  }
}
