"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { getDeviceId } from "@/lib/device";

const CATEGORIES = [
  "pothole",
  "waterlogging",
  "garbage_dumping",
  "streetlight_outage",
  "traffic_hotspot",
  "illegal_parking",
  "footpath_obstruction",
  "signal_malfunction",
  "open_manhole",
  "construction_debris",
  "other",
] as const;

type Category = (typeof CATEGORIES)[number];
type Step = "capture" | "classify" | "confirm" | "submitting" | "done";
type UiLocale = "en" | "kn" | "ml";

type Suggestion = { category: Category; confidence: number };
type PreviewResult = { suggestions: Suggestion[]; confidence: number; quick_summary: string };
type SubmitResult = {
  public_id: string;
  share_url: string;
  email_notify_url: string;
  whatsapp_notify_url: string;
};

const CATEGORY_LABELS: Record<Category, string> = {
  pothole: "Pothole",
  waterlogging: "Waterlogging",
  garbage_dumping: "Garbage Dumping",
  streetlight_outage: "Streetlight Outage",
  traffic_hotspot: "Traffic Hotspot",
  illegal_parking: "Illegal Parking",
  footpath_obstruction: "Footpath Obstruction",
  signal_malfunction: "Signal Malfunction",
  open_manhole: "Open Manhole",
  construction_debris: "Construction Debris",
  other: "Other",
};

const AI_CONFIDENCE_THRESHOLD = 0.72;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const UI_TEXT: Record<
  UiLocale,
  {
    capture: string;
    classify: string;
    submit: string;
    captureHeading: string;
    captureHint: string;
    confirmHeading: string;
    optionalDescription: string;
    submitReport: string;
    submitting: string;
    success: string;
    viewReport: string;
    reportAnother: string;
    loadingAi: string;
    sending: string;
    fetchingGps: string;
    gpsNotSupported: string;
    gpsFallback: string;
    classificationFailed: string;
    submitFailed: string;
    autoSelected: string;
    manualSelect: string;
    demoOn: string;
    demoOff: string;
    demoLabel: string;
    retake: string;
    takePhoto: string;
    reportId: string;
    category: string;
    location: string;
    placeholder: string;
  }
> = {
  en: {
    capture: "Capture",
    classify: "Classify",
    submit: "Submit",
    captureHeading: "Capture Photo",
    captureHint: "Take a clear photo of the issue.",
    confirmHeading: "Confirm Category",
    optionalDescription: "Optional description",
    submitReport: "Submit Report",
    submitting: "Submitting...",
    success: "Report Submitted",
    viewReport: "View Report",
    reportAnother: "Report Another Issue",
    loadingAi: "AI is analyzing your photo...",
    sending: "Sending your report...",
    fetchingGps: "Fetching GPS...",
    gpsNotSupported: "Geolocation not supported",
    gpsFallback: "GPS unavailable - using default location",
    classificationFailed: "AI classification failed. Please select category manually.",
    submitFailed: "Submission failed. Please try again.",
    autoSelected: "High confidence - auto-selected.",
    manualSelect: "Low confidence - please select the correct category.",
    demoOn: "AI classification is simulated. No backend needed.",
    demoOff: "Requires API backend on localhost:8000.",
    demoLabel: "Demo mode",
    retake: "Retake Photo",
    takePhoto: "Take Photo",
    reportId: "Report ID",
    category: "Category",
    location: "Location",
    placeholder: "Add details about the issue...",
  },
  kn: {
    capture: "ಚಿತ್ರ",
    classify: "ವರ್ಗೀಕರಣ",
    submit: "ಸಲ್ಲಿಕೆ",
    captureHeading: "ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ",
    captureHint: "ಸಮಸ್ಯೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ.",
    confirmHeading: "ವರ್ಗ ದೃಢೀಕರಿಸಿ",
    optionalDescription: "ಐಚ್ಛಿಕ ವಿವರಣೆ",
    submitReport: "ವರದಿ ಸಲ್ಲಿಸಿ",
    submitting: "ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...",
    success: "ವರದಿ ಸಲ್ಲಿಸಲಾಗಿದೆ",
    viewReport: "ವರದಿ ನೋಡಿ",
    reportAnother: "ಮತ್ತೊಂದು ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ",
    loadingAi: "AI ನಿಮ್ಮ ಫೋಟೋ ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ...",
    sending: "ನಿಮ್ಮ ವರದಿ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...",
    fetchingGps: "GPS ಪಡೆಯಲಾಗುತ್ತಿದೆ...",
    gpsNotSupported: "ಜಿಯೊಲೊಕೇಶನ್ ಬೆಂಬಲ ಲಭ್ಯವಿಲ್ಲ",
    gpsFallback: "GPS ಲಭ್ಯವಿಲ್ಲ - ಡೀಫಾಲ್ಟ್ ಸ್ಥಳ ಬಳಕೆ",
    classificationFailed: "AI ವರ್ಗೀಕರಣ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಕೈಯಾರೆ ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ.",
    submitFailed: "ಸಲ್ಲಿಕೆ ವಿಫಲವಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    autoSelected: "ಹೆಚ್ಚಿನ ವಿಶ್ವಾಸ - ಸ್ವಯಂ ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ.",
    manualSelect: "ಕಡಿಮೆ ವಿಶ್ವಾಸ - ದಯವಿಟ್ಟು ಸರಿಯಾದ ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ.",
    demoOn: "AI ವರ್ಗೀಕರಣ ಡೆಮೋ ಮೋಡ್‌ನಲ್ಲಿ ಇದೆ. ಬ್ಯಾಕೆಂಡ್ ಬೇಕಾಗಿಲ್ಲ.",
    demoOff: "localhost:8000 ನಲ್ಲಿ API ಬ್ಯಾಕೆಂಡ್ ಅಗತ್ಯವಿದೆ.",
    demoLabel: "ಡೆಮೋ ಮೋಡ್",
    retake: "ಮತ್ತೆ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ",
    takePhoto: "ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ",
    reportId: "ವರದಿ ಐಡಿ",
    category: "ವರ್ಗ",
    location: "ಸ್ಥಳ",
    placeholder: "ಸಮಸ್ಯೆಯ ಕುರಿತು ವಿವರಗಳನ್ನು ಸೇರಿಸಿ...",
  },
  ml: {
    capture: "പകർത്തുക",
    classify: "വർഗ്ഗീകരണം",
    submit: "സമർപ്പിക്കുക",
    captureHeading: "ഫോട്ടോ എടുക്കുക",
    captureHint: "പ്രശ്നത്തിന്റെ വ്യക്തമായ ഫോട്ടോ എടുക്കുക.",
    confirmHeading: "വിഭാഗം സ്ഥിരീകരിക്കുക",
    optionalDescription: "ഐച്ഛിക വിവരണം",
    submitReport: "റിപ്പോർട്ട് സമർപ്പിക്കുക",
    submitting: "സമർപ്പിക്കുന്നു...",
    success: "റിപ്പോർട്ട് സമർപ്പിച്ചു",
    viewReport: "റിപ്പോർട്ട് കാണുക",
    reportAnother: "മറ്റൊരു പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    loadingAi: "AI നിങ്ങളുടെ ഫോട്ടോ വിശകലനം ചെയ്യുന്നു...",
    sending: "നിങ്ങളുടെ റിപ്പോർട്ട് അയക്കുന്നു...",
    fetchingGps: "GPS ലഭ്യമാക്കുന്നു...",
    gpsNotSupported: "ജിയോലൊക്കേഷൻ പിന്തുണ ലഭ്യമല്ല",
    gpsFallback: "GPS ലഭ്യമല്ല - ഡീഫോൾട്ട് സ്ഥലം ഉപയോഗിക്കുന്നു",
    classificationFailed: "AI വർഗ്ഗീകരണം പരാജയപ്പെട്ടു. ദയവായി മാനുവലായി വിഭാഗം തിരഞ്ഞെടുക്കുക.",
    submitFailed: "സമർപ്പിക്കൽ പരാജയപ്പെട്ടു. വീണ്ടും ശ്രമിക്കുക.",
    autoSelected: "ഉയർന്ന ആത്മവിശ്വാസം - സ്വയമേവ തിരഞ്ഞെടുത്തു.",
    manualSelect: "കുറഞ്ഞ ആത്മവിശ്വാസം - ദയവായി ശരിയായ വിഭാഗം തിരഞ്ഞെടുക്കുക.",
    demoOn: "AI വർഗ്ഗീകരണം ഡെമോ മോഡിലാണ്. ബാക്കെൻഡ് ആവശ്യമില്ല.",
    demoOff: "localhost:8000 ൽ API ബാക്കെൻഡ് ആവശ്യമാണ്.",
    demoLabel: "ഡെമോ മോഡ്",
    retake: "വീണ്ടും ഫോട്ടോ എടുക്കുക",
    takePhoto: "ഫോട്ടോ എടുക്കുക",
    reportId: "റിപ്പോർട്ട് ഐഡി",
    category: "വിഭാഗം",
    location: "സ്ഥലം",
    placeholder: "പ്രശ്നത്തെക്കുറിച്ച് കൂടുതൽ വിവരങ്ങൾ ചേർക്കുക...",
  },
};

function uploadPayloadFor(file: File): { media_type: "image" | "video"; file_ext: string } {
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const parts = file.name.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : mediaType === "video" ? "mp4" : "jpg";
  return { media_type: mediaType, file_ext: ext };
}

function mockClassify(): PreviewResult {
  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  const c1 = 0.6 + Math.random() * 0.35;
  const c2 = (1 - c1) * (0.4 + Math.random() * 0.4);
  const c3 = 1 - c1 - c2;
  return {
    suggestions: [
      { category: shuffled[0], confidence: Number(c1.toFixed(2)) },
      { category: shuffled[1], confidence: Number(c2.toFixed(2)) },
      { category: shuffled[2], confidence: Number(c3.toFixed(2)) },
    ],
    confidence: Number(c1.toFixed(2)),
    quick_summary: `Looks like ${CATEGORY_LABELS[shuffled[0]].toLowerCase()}.`,
  };
}

function mockSubmit(): SubmitResult {
  const id = `RPT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    public_id: id,
    share_url: `${origin}/reports/${id}`,
    email_notify_url: `${API_BASE}/v1/reports/${id}/notify/email`,
    whatsapp_notify_url: `${API_BASE}/v1/reports/${id}/notify/whatsapp`,
  };
}

export default function ReportFlow() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("capture");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [manualIssueLabel, setManualIssueLabel] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [locale] = useState<UiLocale>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    try {
      const saved = localStorage.getItem("locale");
      if (saved === "kn" || saved === "ml") {
        return saved;
      }
    } catch {
      // storage may be blocked
    }
    return "en";
  });
  const [demoMode, setDemoMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return new URLSearchParams(window.location.search).get("demo") === "true";
  });

  const t = useMemo(() => UI_TEXT[locale] || UI_TEXT.en, [locale]);

  const captureLocation = useCallback(async () => {
    setLocationStatus(t.fetchingGps);
    try {
      if (!navigator.geolocation) {
        setLocationStatus(t.gpsNotSupported);
        return;
      }
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        }),
      );
      setLat(pos.coords.latitude);
      setLon(pos.coords.longitude);
      setGpsAccuracyM(pos.coords.accuracy);
      setLocationStatus(`GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
    } catch {
      setLat(12.9716);
      setLon(77.5946);
      setLocationStatus(t.gpsFallback);
    }
  }, [t.fetchingGps, t.gpsFallback, t.gpsNotSupported]);

  const runClassify = useCallback(
    async (file: File) => {
      setBusy(true);
      setStatus(t.loadingAi);
      try {
        if (demoMode) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const simulated = mockClassify();
          setPreview(simulated);
          if (simulated.confidence >= AI_CONFIDENCE_THRESHOLD) {
            setSelected(simulated.suggestions[0].category);
          }
          setStep("confirm");
          setStatus("");
          return;
        }

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });

        const response = await fetch(`${API_BASE}/v1/reports/classify-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64, lat, lon }),
        });
        if (!response.ok) {
          throw new Error("classification failed");
        }
        const data = await response.json();
        const nextPreview: PreviewResult = {
          suggestions: data.top_3_categories || data.suggestions || [],
          confidence: data.confidence ?? 0,
          quick_summary: data.quick_summary ?? "",
        };
        setPreview(nextPreview);
        if (nextPreview.confidence >= AI_CONFIDENCE_THRESHOLD && nextPreview.suggestions[0]) {
          setSelected(nextPreview.suggestions[0].category);
        }
        setStep("confirm");
        setStatus("");
      } catch {
        setPreview(null);
        setStep("confirm");
        setStatus(t.classificationFailed);
      } finally {
        setBusy(false);
      }
    },
    [demoMode, lat, lon, t.classificationFailed, t.loadingAi],
  );

  const handleCapture = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setCapturedAt(new Date().toISOString());
      setPreview(null);
      setSelected(null);
      setManualIssueLabel("");
      setResult(null);
      setStep("classify");
      captureLocation();
      runClassify(file);
    },
    [captureLocation, imageUrl, runClassify],
  );

  const handleSubmit = useCallback(async () => {
    if (!selected || !imageFile) {
      return;
    }

    setStep("submitting");
    setBusy(true);
    setStatus(t.submitting);

    try {
      if (demoMode) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        setResult(mockSubmit());
        setStep("done");
        setStatus("");
        return;
      }

      const uploadResponse = await fetch(`${API_BASE}/v1/media/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadPayloadFor(imageFile)),
      });
      if (!uploadResponse.ok) {
        throw new Error("upload-url failed");
      }
      const { upload_url: uploadUrl, media_key: mediaKey } = await uploadResponse.json();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": imageFile.type || "image/jpeg" },
        body: imageFile,
      });

      const submitResponse = await fetch(`${API_BASE}/v1/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: lat ?? 12.9716,
          lon: lon ?? 77.5946,
          category_final: selected,
          capture_origin: "camera",
          captured_at: capturedAt ?? new Date().toISOString(),
          gps_accuracy_m: gpsAccuracyM,
          manual_issue_label: selected === "other" ? manualIssueLabel.trim() : null,
          description_user: description || null,
          media_keys: [mediaKey],
          device_id: getDeviceId(),
        }),
      });
      if (!submitResponse.ok) {
        throw new Error("submit failed");
      }
      const payload = await submitResponse.json();
      setResult({
        public_id: payload.public_id,
        share_url: payload.share_url ?? `${window.location.origin}/reports/${payload.public_id}`,
        email_notify_url: payload.notify_actions?.email ?? `${API_BASE}/v1/reports/${payload.public_id}/notify/email`,
        whatsapp_notify_url:
          payload.notify_actions?.whatsapp ?? `${API_BASE}/v1/reports/${payload.public_id}/notify/whatsapp`,
      });
      setStep("done");
      setStatus("");
    } catch {
      setStep("confirm");
      setStatus(t.submitFailed);
    } finally {
      setBusy(false);
    }
  }, [capturedAt, demoMode, description, gpsAccuracyM, imageFile, lat, lon, manualIssueLabel, selected, t.submitFailed, t.submitting]);

  const reset = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setStep("capture");
    setImageUrl(null);
    setImageFile(null);
    setLat(null);
    setLon(null);
    setLocationStatus("");
    setPreview(null);
    setSelected(null);
    setManualIssueLabel("");
    setCapturedAt(null);
    setGpsAccuracyM(null);
    setDescription("");
    setResult(null);
    setStatus("");
    setBusy(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <div className="reportFlow">
      <div className="demoBanner">
        <label className="demoToggle">
          <input type="checkbox" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} />
          <span>{t.demoLabel}</span>
        </label>
        <span className="muted" style={{ fontSize: 13 }}>
          {demoMode ? t.demoOn : t.demoOff}
        </span>
      </div>

      <div className="stepIndicator">
        <div className={`stepDot ${step === "capture" ? "active" : ""} ${["classify", "confirm", "submitting", "done"].includes(step) ? "completed" : ""}`}>
          <span>1</span>
          <small>{t.capture}</small>
        </div>
        <div className="stepLine" />
        <div className={`stepDot ${["classify", "confirm"].includes(step) ? "active" : ""} ${["submitting", "done"].includes(step) ? "completed" : ""}`}>
          <span>2</span>
          <small>{t.classify}</small>
        </div>
        <div className="stepLine" />
        <div className={`stepDot ${step === "submitting" ? "active" : ""} ${step === "done" ? "completed" : ""}`}>
          <span>3</span>
          <small>{t.submit}</small>
        </div>
      </div>

      <section className="flowCard">
        <h2>{t.captureHeading}</h2>
        <p className="muted">{t.captureHint}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          style={{ display: "none" }}
        />
        <button className="button captureBtn" onClick={() => fileRef.current?.click()} disabled={busy}>
          {imageUrl ? t.retake : t.takePhoto}
        </button>
        {imageUrl ? (
          <div className="imagePreview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Issue preview" />
          </div>
        ) : null}
        {locationStatus ? <p className="locationBadge">{locationStatus}</p> : null}
      </section>

      {step !== "capture" ? (
        <section className="flowCard">
          <h2>{t.confirmHeading}</h2>
          {busy && step === "classify" ? (
            <div className="aiLoading">
              <div className="spinner" />
              <span>{t.loadingAi}</span>
            </div>
          ) : null}

          {preview ? (
            <>
              <p className="aiSummary">{preview.quick_summary}</p>
              <div className="suggestionChips">
                {preview.suggestions.map((item) => (
                  <button
                    key={item.category}
                    className={`suggestionChip ${selected === item.category ? "selected" : ""}`}
                    onClick={() => setSelected(item.category)}
                    disabled={step === "done" || step === "submitting"}
                  >
                    <span className="chipLabel">{CATEGORY_LABELS[item.category]}</span>
                    <span className="chipConf">{(item.confidence * 100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                {preview.confidence >= AI_CONFIDENCE_THRESHOLD ? t.autoSelected : t.manualSelect}
              </p>
            </>
          ) : null}

          {!preview && step === "confirm" ? (
            <div className="categoryGrid">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`categoryBtn ${selected === category ? "selected" : ""}`}
                  onClick={() => setSelected(category)}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          ) : null}

          <div className="descriptionField">
            {selected === "other" ? (
              <>
                <label htmlFor="manualIssueLabel" className="muted" style={{ fontSize: 13 }}>
                  Manual issue label (required for Other)
                </label>
                <input
                  id="manualIssueLabel"
                  type="text"
                  value={manualIssueLabel}
                  onChange={(event) => setManualIssueLabel(event.target.value)}
                  maxLength={120}
                  disabled={step === "done" || step === "submitting"}
                />
              </>
            ) : null}
            <label htmlFor="description" className="muted" style={{ fontSize: 13 }}>
              {t.optionalDescription}
            </label>
            <textarea
              id="description"
              placeholder={t.placeholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={500}
              disabled={step === "done" || step === "submitting"}
            />
          </div>

          {step === "confirm" ? (
            <button
              className="button submitBtn"
              onClick={handleSubmit}
              disabled={!selected || busy || (selected === "other" && !manualIssueLabel.trim())}
            >
              {t.submitReport}
            </button>
          ) : null}
        </section>
      ) : null}

      {step === "submitting" ? (
        <section className="flowCard">
          <h2>{t.submitting}</h2>
          <div className="aiLoading">
            <div className="spinner" />
            <span>{t.sending}</span>
          </div>
        </section>
      ) : null}

      {step === "done" && result ? (
        <section className="flowCard successCard">
          <h2>{t.success}</h2>
          <div className="resultDetails">
            <div className="resultItem">
              <span className="resultLabel">{t.reportId}</span>
              <span className="resultValue">{result.public_id}</span>
            </div>
            <div className="resultItem">
              <span className="resultLabel">{t.category}</span>
              <span className="chip">{selected ? CATEGORY_LABELS[selected] : "-"}</span>
            </div>
            {locationStatus ? (
              <div className="resultItem">
                <span className="resultLabel">{t.location}</span>
                <span className="resultValue">{locationStatus}</span>
              </div>
            ) : null}
          </div>
          <div className="resultActions">
            <Link href={result.share_url} className="button secondary">
              {t.viewReport}
            </Link>
            <button className="button" onClick={reset}>
              {t.reportAnother}
            </button>
          </div>
        </section>
      ) : null}

      {status ? <p className="statusMsg">{status}</p> : null}

      <style>{`
        .reportFlow {
          display: grid;
          gap: 16px;
          max-width: 560px;
          margin: 0 auto;
        }
        .demoBanner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-radius: 10px;
        }
        .demoToggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
        }
        .stepIndicator {
          display: flex;
          align-items: center;
        }
        .stepDot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .stepDot span {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          border: 2px solid #ccc;
          color: #999;
          background: #fff;
          transition: all 0.3s;
        }
        .stepDot small {
          font-size: 11px;
          color: #999;
        }
        .stepDot.active span {
          border-color: var(--accent);
          background: var(--accent);
          color: #fff;
        }
        .stepDot.active small {
          color: var(--accent);
          font-weight: 600;
        }
        .stepDot.completed span {
          border-color: var(--accent-soft);
          background: #e8f5ef;
          color: var(--accent);
        }
        .stepLine {
          flex: 1;
          height: 2px;
          background: #ddd;
          margin: 0 4px 18px;
        }
        .flowCard {
          background: var(--card);
          border: 1px solid #d7d1bf;
          border-radius: 16px;
          padding: 20px;
          display: grid;
          gap: 12px;
        }
        .flowCard h2 {
          margin: 0;
          font-size: 1.1rem;
        }
        .captureBtn,
        .submitBtn {
          width: 100%;
          text-align: center;
        }
        .imagePreview {
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e5ddca;
        }
        .imagePreview img {
          width: 100%;
          max-height: 300px;
          object-fit: cover;
          display: block;
        }
        .locationBadge {
          font-size: 13px;
          background: #f5f3ec;
          padding: 8px 12px;
          border-radius: 8px;
          margin: 0;
        }
        .aiLoading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: #f0faf4;
          border-radius: 10px;
          color: var(--accent);
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid #cde8d8;
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .aiSummary {
          margin: 0;
          font-size: 14px;
          padding: 10px 14px;
          background: #f0faf4;
          border-radius: 8px;
          border-left: 3px solid var(--accent);
        }
        .suggestionChips,
        .categoryGrid {
          display: grid;
          gap: 8px;
        }
        .categoryGrid {
          grid-template-columns: 1fr 1fr;
        }
        .suggestionChip,
        .categoryBtn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          border: 2px solid #e5ddca;
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s;
        }
        .suggestionChip:hover,
        .categoryBtn:hover {
          border-color: var(--accent);
        }
        .suggestionChip.selected,
        .categoryBtn.selected {
          border-color: var(--accent);
          background: #e8f5ef;
        }
        .chipConf {
          font-weight: 700;
          color: var(--accent);
        }
        .descriptionField {
          display: grid;
          gap: 4px;
        }
        .descriptionField textarea {
          padding: 10px 12px;
          border: 1px solid #d7d1bf;
          border-radius: 10px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          background: #fff;
        }
        .descriptionField input {
          padding: 10px 12px;
          border: 1px solid #d7d1bf;
          border-radius: 10px;
          font-family: inherit;
          font-size: 14px;
          background: #fff;
        }
        .descriptionField input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px #0c7a5f22;
        }
        .descriptionField textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px #0c7a5f22;
        }
        .successCard {
          border-color: var(--accent-soft);
          background: #f0faf4dd;
        }
        .resultDetails {
          display: grid;
          gap: 10px;
        }
        .resultItem {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .resultLabel {
          font-size: 13px;
          color: var(--ink-1);
          min-width: 72px;
        }
        .resultValue {
          font-weight: 600;
          font-size: 14px;
        }
        .resultActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .statusMsg {
          font-size: 14px;
          color: var(--danger);
          padding: 10px;
          background: #fff0f0;
          border-radius: 8px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
