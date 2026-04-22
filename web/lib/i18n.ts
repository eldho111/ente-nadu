export type Locale = "en" | "kn" | "ml";

export const SUPPORTED_LOCALES: Locale[] = ["en", "kn", "ml"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  kn: "Kannada",
  ml: "Malayalam",
};

type Messages = {
  brand: string;
  navMap: string;
  navReport: string;
  navAccountability: string;
  navDashboard: string;
  navOps: string;
  navTrack: string;
  navSettings: string;
  homeTitle: string;
  homeSubtitle: string;
  homeReportCta: string;
  homeDashCta: string;
  reportTitle: string;
  reportSubtitle: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  appModeSubtitle: string;
  appNearbyTitle: string;
  appNearbySubtitle: string;
  appTrackTitle: string;
  appTrackSubtitle: string;
  appSettingsTitle: string;
  appSettingsSubtitle: string;
  // First-time intro / explanation on mobile app home
  appIntroEyebrow: string;
  appIntroTitle: string;
  appIntroBody: string;
  appIntroStep1: string;
  appIntroStep2: string;
  appIntroStep3: string;
  appIntroCta: string;
  appIntroDismiss: string;
  // Small bits previously hardcoded in English
  yourAreaKerala: string;
  safeModeTag: string;
  safeModeLine: string;
  fullMapCta: string;
  kpiTotal: string;
  kpiOpen: string;
  kpiFixed: string;
};

const MESSAGES: Record<Locale, Messages> = {
  en: {
    brand: "Ente Nadu",
    navMap: "Map",
    navReport: "Report Issue",
    navAccountability: "Accountability",
    navDashboard: "Dashboard",
    navOps: "Receiver Ops",
    navTrack: "Track",
    navSettings: "Settings",
    homeTitle: "Ente Nadu",
    homeSubtitle:
      "Report civic issues across Kerala with photo evidence. AI classifies your report, routes it to the responsible department, and tracks your elected representatives' performance.",
    homeReportCta: "Report an Issue",
    homeDashCta: "View Ward Dashboard",
    reportTitle: "Report a Civic Issue",
    reportSubtitle: "Snap a photo, confirm the category, and submit. Takes about 20 seconds.",
    dashboardTitle: "Ward Accountability Dashboard",
    dashboardSubtitle: "Public leaderboard by ward and zone with open volume and escalation activity.",
    appModeSubtitle: "App mode",
    appNearbyTitle: "Nearby Issues",
    appNearbySubtitle: "Live map with offline fallback.",
    appTrackTitle: "Track Updates",
    appTrackSubtitle: "Status updates for your subscribed reports.",
    appSettingsTitle: "Settings",
    appSettingsSubtitle: "Language, branding info, and install guidance.",
    appIntroEyebrow: "What is Ente Nadu?",
    appIntroTitle: "Report civic issues. Hold your government accountable.",
    appIntroBody:
      "Ente Nadu is a citizen-run platform for Kerala. Take a photo of a pothole, broken streetlight, garbage pile, or any civic issue — AI identifies the problem, routes it to the right department (PWD, KWA, KSEB, local body), and tracks whether it actually gets fixed.",
    appIntroStep1: "Tap Report, point your camera at the issue.",
    appIntroStep2: "AI classifies it and routes to the right department.",
    appIntroStep3: "Track the fix on the public map + hold MLAs accountable.",
    appIntroCta: "Report my first issue",
    appIntroDismiss: "Got it",
    yourAreaKerala: "Your area · Kerala",
    safeModeTag: "Safe",
    safeModeLine: "Map disabled for low-end devices.",
    fullMapCta: "Full map →",
    kpiTotal: "Total",
    kpiOpen: "Open",
    kpiFixed: "Fixed",
  },
  kn: {
    brand: "Ente Nadu",
    navMap: "ನಕ್ಷೆ",
    navReport: "ಸಮಸ್ಯೆ ವರದಿ",
    navAccountability: "ಹೊಣೆಗಾರಿಕೆ",
    navDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    navOps: "ಅಧಿಕಾರಿ ಇನ್‌ಬಾಕ್ಸ್",
    navTrack: "ಟ್ರ್ಯಾಕ್",
    navSettings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    homeTitle: "Ente Nadu",
    homeSubtitle:
      "ರಚಿತ ಸಾಕ್ಷ್ಯ, ವೇಗದ ವರದಿ, ಮತ್ತು ವಾರ್ಡ್ ಮಟ್ಟದ ಸಾರ್ವಜನಿಕ ಹೊಣೆಗಾರಿಕೆ ಚಕ್ರಗಳು. ಗೌಪ್ಯತೆಗಾಗಿ ಮನೆ ಮಟ್ಟದ ನಿಖರ ಸ್ಥಳವನ್ನು ಮರೆಮಾಡಲಾಗುತ್ತದೆ.",
    homeReportCta: "ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ",
    homeDashCta: "ವಾರ್ಡ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ನೋಡಿ",
    reportTitle: "ನಾಗರಿಕ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ",
    reportSubtitle: "ಫೋಟೋ ತೆಗೆದು, ವರ್ಗ ದೃಢೀಕರಿಸಿ, ಸಲ್ಲಿಸಿ. ಸುಮಾರು 20 ಸೆಕೆಂಡ್.",
    dashboardTitle: "ವಾರ್ಡ್ ಹೊಣೆಗಾರಿಕೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    dashboardSubtitle: "ವಾರ್ಡ್ ಮತ್ತು ವಲಯ ಆಧಾರಿತ ಸಾರ್ವಜನಿಕ ಮೆಟ್ರಿಕ್‌ಗಳು ಮತ್ತು ಎಸ್ಕಲೇಶನ್ ಚಟುವಟಿಕೆ.",
    appModeSubtitle: "ಆ್ಯಪ್ ಮೋಡ್",
    appNearbyTitle: "ಸಮೀಪದ ಸಮಸ್ಯೆಗಳು",
    appNearbySubtitle: "ಆಫ್‌ಲೈನ್ ಬ್ಯಾಕಪ್ ಜೊತೆಗೆ ಲೈವ್ ನಕ್ಷೆ.",
    appTrackTitle: "ಅಪ್‌ಡೇಟ್ ಟ್ರ್ಯಾಕ್",
    appTrackSubtitle: "ನೀವು ಚಂದಾದಾರರಾದ ವರದಿಗಳ ಸ್ಥಿತಿ ಅಪ್‌ಡೇಟ್‌ಗಳು.",
    appSettingsTitle: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    appSettingsSubtitle: "ಭಾಷೆ, ಬ್ರ್ಯಾಂಡ್ ಮಾಹಿತಿ ಮತ್ತು ಇನ್‌ಸ್ಟಾಲ್ ಮಾರ್ಗದರ್ಶನ.",
    appIntroEyebrow: "Ente Nadu ಎಂದರೇನು?",
    appIntroTitle: "ನಾಗರಿಕ ಸಮಸ್ಯೆಗಳನ್ನು ವರದಿ ಮಾಡಿ. ಸರ್ಕಾರವನ್ನು ಹೊಣೆಗಾರಿಕೆಗೊಳಿಸಿ.",
    appIntroBody:
      "Ente Nadu ಕೇರಳದ ನಾಗರಿಕರಿಂದ ನಡೆಸಲ್ಪಡುವ ವೇದಿಕೆ. ರಸ್ತೆ ಹಳ್ಳ, ಮುರಿದ ಬೀದಿ ದೀಪ, ಕಸ ರಾಶಿ ಇತ್ಯಾದಿ ಸಮಸ್ಯೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ — AI ಸಮಸ್ಯೆಯನ್ನು ಗುರುತಿಸಿ ಸರಿಯಾದ ಇಲಾಖೆಗೆ (PWD, KWA, KSEB, ಸ್ಥಳೀಯ ಸಂಸ್ಥೆ) ಕಳುಹಿಸುತ್ತದೆ ಮತ್ತು ಪರಿಹಾರವಾಗಿದೆಯೇ ಎಂದು ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತದೆ.",
    appIntroStep1: "Report ಒತ್ತಿ, ಕ್ಯಾಮೆರಾವನ್ನು ಸಮಸ್ಯೆಯ ಕಡೆಗೆ ತೋರಿಸಿ.",
    appIntroStep2: "AI ಸಮಸ್ಯೆಯನ್ನು ವರ್ಗೀಕರಿಸಿ ಸರಿಯಾದ ಇಲಾಖೆಗೆ ಕಳುಹಿಸುತ್ತದೆ.",
    appIntroStep3: "ಸಾರ್ವಜನಿಕ ನಕ್ಷೆಯಲ್ಲಿ ಪರಿಹಾರವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, MLA-ಗಳನ್ನು ಹೊಣೆಗಾರಿಕೆಗೊಳಿಸಿ.",
    appIntroCta: "ನನ್ನ ಮೊದಲ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ",
    appIntroDismiss: "ಅರ್ಥವಾಯಿತು",
    yourAreaKerala: "ನಿಮ್ಮ ಪ್ರದೇಶ · ಕೇರಳ",
    safeModeTag: "ಸೇಫ್",
    safeModeLine: "ಕಡಿಮೆ ಸಾಮರ್ಥ್ಯದ ಫೋನ್‌ಗೆ ನಕ್ಷೆ ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ.",
    fullMapCta: "ಪೂರ್ಣ ನಕ್ಷೆ →",
    kpiTotal: "ಒಟ್ಟು",
    kpiOpen: "ತೆರೆದ",
    kpiFixed: "ಪರಿಹಾರ",
  },
  ml: {
    brand: "എന്റെ നാട്",
    navMap: "മാപ്പ്",
    navReport: "പ്രശ്നം റിപ്പോർട്ട്",
    navAccountability: "ഉത്തരവാദിത്തം",
    navDashboard: "ഡാഷ്ബോർഡ്",
    navOps: "ഓഫീഷ്യൽ ഇൻബോക്സ്",
    navTrack: "ട്രാക്ക്",
    navSettings: "ക്രമീകരണങ്ങൾ",
    homeTitle: "എന്റെ നാട്",
    homeSubtitle:
      "ഘടനാപരമായ തെളിവുകൾ, വേഗത്തിലുള്ള റിപ്പോർട്ടിംഗ്, വാർഡ് തലത്തിലുള്ള പൊതുഉത്തരവാദിത്ത ലൂപ്പുകൾ. സ്വകാര്യതയ്ക്കായി കൃത്യമായ വീടിന്റെ സ്ഥാനം മറച്ചിരിക്കും.",
    homeReportCta: "പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    homeDashCta: "വാർഡ് ഡാഷ്ബോർഡ് കാണുക",
    reportTitle: "സിവിക് പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    reportSubtitle: "ഫോട്ടോ എടുക്കുക, വിഭാഗം സ്ഥിരീകരിക്കുക, സമർപ്പിക്കുക. ഏകദേശം 20 സെക്കൻഡ്.",
    dashboardTitle: "വാർഡ് ഉത്തരവാദിത്ത ഡാഷ്ബോർഡ്",
    dashboardSubtitle: "വാർഡ്/സോൺ അടിസ്ഥാനത്തിലുള്ള പൊതുമെട്രിക്‌സും എസ്കലേഷൻ പ്രവർത്തനവും.",
    appModeSubtitle: "ആപ്പ് മോഡ്",
    appNearbyTitle: "സമീപ പ്രശ്നങ്ങൾ",
    appNearbySubtitle: "ഓഫ്‌ലൈൻ പിന്തുണയോടെ തത്സമയ മാപ്പ്.",
    appTrackTitle: "അപ്‌ഡേറ്റുകൾ ട്രാക്ക് ചെയ്യുക",
    appTrackSubtitle: "നിങ്ങൾ ചന്ദാദാരനായ റിപ്പോർട്ടുകളുടെ നില അപ്‌ഡേറ്റുകൾ.",
    appSettingsTitle: "ക്രമീകരണങ്ങൾ",
    appSettingsSubtitle: "ഭാഷ, ബ്രാൻഡ് വിവരങ്ങൾ, ഇൻസ്റ്റാൾ മാർഗ്ഗനിർദേശം.",
    appIntroEyebrow: "എന്താണ് Ente Nadu?",
    appIntroTitle: "പൗര പ്രശ്നങ്ങൾ റിപ്പോർട്ട് ചെയ്യുക. സർക്കാരിനെ ഉത്തരവാദിത്തപ്പെടുത്തുക.",
    appIntroBody:
      "Ente Nadu കേരളത്തിലെ പൗരന്മാർ നടത്തുന്ന പ്ലാറ്റ്ഫോം. കുഴികൾ, തകർന്ന തെരുവ് വിളക്കുകൾ, മാലിന്യം എന്നിവയുടെ ഫോട്ടോ എടുക്കുക — AI പ്രശ്നം തിരിച്ചറിഞ്ഞ് ശരിയായ വകുപ്പിലേക്ക് (PWD, KWA, KSEB, തദ്ദേശ സ്ഥാപനം) അയക്കും, പരിഹരിക്കപ്പെട്ടോ എന്ന് ട്രാക്ക് ചെയ്യും.",
    appIntroStep1: "Report ടാപ്പ് ചെയ്യുക, ക്യാമറ പ്രശ്നത്തിലേക്ക് നേരെ വയ്ക്കുക.",
    appIntroStep2: "AI അതിനെ തരംതിരിച്ച് ശരിയായ വകുപ്പിലേക്ക് അയക്കുന്നു.",
    appIntroStep3: "പൊതു മാപ്പിൽ പരിഹാരം ട്രാക്ക് ചെയ്യുക, MLA-മാരെ ഉത്തരവാദിത്തപ്പെടുത്തുക.",
    appIntroCta: "എന്റെ ആദ്യ പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    appIntroDismiss: "മനസ്സിലായി",
    yourAreaKerala: "നിങ്ങളുടെ പ്രദേശം · കേരളം",
    safeModeTag: "സുരക്ഷിതം",
    safeModeLine: "കുറഞ്ഞ സവിശേഷതകളുള്ള ഫോണുകൾക്കായി മാപ്പ് പ്രവർത്തനരഹിതമാക്കി.",
    fullMapCta: "പൂർണ്ണ മാപ്പ് →",
    kpiTotal: "ആകെ",
    kpiOpen: "തുറന്നത്",
    kpiFixed: "പരിഹരിച്ചു",
  },
};

export function resolveLocale(input?: string | null): Locale {
  if (input && SUPPORTED_LOCALES.includes(input as Locale)) {
    return input as Locale;
  }
  return "en";
}

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

