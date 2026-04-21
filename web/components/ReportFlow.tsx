"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getDeviceId } from "@/lib/device";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/reportConstants";

type Step = "ready" | "processing" | "review" | "submitting" | "done" | "error";
type UiLocale = "en" | "kn" | "ml";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const AI_CONFIDENCE_THRESHOLD = 0.72;

const TEXT: Record<UiLocale, Record<string, string>> = {
  en: {
    heroTitle: "Report a civic issue",
    heroSub: "Take a photo. We'll handle the rest.",
    takePhoto: "Take Photo",
    processing: "Analyzing your photo...",
    gettingLocation: "Getting your location...",
    classifying: "AI is identifying the issue...",
    uploading: "Submitting your report...",
    reviewTitle: "Is this correct?",
    submit: "Yes, Submit Report",
    changeCategory: "Change Category",
    success: "Report Submitted!",
    successSub: "Your report has been submitted and routed to the concerned authority.",
    viewReport: "View Report",
    reportAnother: "Report Another Issue",
    errorTitle: "Backend server not connected",
    errorSub: "The report was captured but the server is not running yet. Your report will be saved when the backend is deployed.",
    tryAgain: "Try Again",
    selectCategory: "Select the correct category:",
    cancel: "Cancel",
  },
  ml: {
    heroTitle: "ഒരു പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    heroSub: "ഫോട്ടോ എടുക്കുക. ബാക്കി ഞങ്ങൾ നോക്കിക്കൊള്ളാം.",
    takePhoto: "ഫോട്ടോ എടുക്കുക",
    processing: "ഫോട്ടോ വിശകലനം ചെയ്യുന്നു...",
    gettingLocation: "ലൊക്കേഷൻ ലഭ്യമാക്കുന്നു...",
    classifying: "AI പ്രശ്നം തിരിച്ചറിയുന്നു...",
    uploading: "റിപ്പോർട്ട് സമർപ്പിക്കുന്നു...",
    reviewTitle: "ഇത് ശരിയാണോ?",
    submit: "അതെ, സമർപ്പിക്കുക",
    changeCategory: "വിഭാഗം മാറ്റുക",
    success: "റിപ്പോർട്ട് സമർപ്പിച്ചു!",
    successSub: "നിങ്ങളുടെ റിപ്പോർട്ട് ബന്ധപ്പെട്ട അധികാരികൾക്ക് അയച്ചു.",
    viewReport: "റിപ്പോർട്ട് കാണുക",
    reportAnother: "മറ്റൊരു പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    errorTitle: "സെർവർ ബന്ധിപ്പിച്ചിട്ടില്ല",
    errorSub: "റിപ്പോർട്ട് ക്യാപ്ചർ ചെയ്തു, പക്ഷേ സെർവർ പ്രവർത്തിക്കുന്നില്ല. ബാക്കെൻഡ് വിന്യസിക്കുമ്പോൾ സംരക്ഷിക്കും.",
    tryAgain: "വീണ്ടും ശ്രമിക്കുക",
    selectCategory: "ശരിയായ വിഭാഗം തിരഞ്ഞെടുക്കുക:",
    cancel: "റദ്ദാക്കുക",
  },
  kn: {
    heroTitle: "ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ",
    heroSub: "ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ. ಮಿಕ್ಕಿದ್ದು ನಾವು ನೋಡಿಕೊಳ್ಳುತ್ತೇವೆ.",
    takePhoto: "ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ",
    processing: "ಫೋಟೋ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    gettingLocation: "ಸ್ಥಳ ಪಡೆಯಲಾಗುತ್ತಿದೆ...",
    classifying: "AI ಸಮಸ್ಯೆ ಗುರುತಿಸುತ್ತಿದೆ...",
    uploading: "ವರದಿ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...",
    reviewTitle: "ಇದು ಸರಿಯೇ?",
    submit: "ಹೌದು, ಸಲ್ಲಿಸಿ",
    changeCategory: "ವರ್ಗ ಬದಲಿಸಿ",
    success: "ವರದಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!",
    successSub: "ನಿಮ್ಮ ವರದಿ ಸಂಬಂಧಿತ ಪ್ರಾಧಿಕಾರಕ್ಕೆ ಕಳುಹಿಸಲಾಗಿದೆ.",
    viewReport: "ವರದಿ ನೋಡಿ",
    reportAnother: "ಮತ್ತೊಂದು ಸಮಸ್ಯೆ",
    errorTitle: "ಸರ್ವರ್ ಸಂಪರ್ಕ ಇಲ್ಲ",
    errorSub: "ವರದಿ ಕ್ಯಾಪ್ಚರ್ ಆಗಿದೆ, ಆದರೆ ಸರ್ವರ್ ಚಾಲನೆಯಲ್ಲಿಲ್ಲ.",
    tryAgain: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    selectCategory: "ಸರಿಯಾದ ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ:",
    cancel: "ರದ್ದುಮಾಡಿ",
  },
};

const ALL_CATEGORIES = [
  "pothole", "waterlogging", "garbage_dumping", "streetlight_outage",
  "traffic_hotspot", "illegal_parking", "footpath_obstruction", "signal_malfunction",
  "open_manhole", "construction_debris", "canal_blockage", "stray_animal_menace",
  "tree_fall_risk", "flood_drainage", "public_toilet", "other",
];

export default function ReportFlow() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("ready");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [summary, setSummary] = useState("");
  const [statusText, setStatusText] = useState("");
  const [resultId, setResultId] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [locale] = useState<UiLocale>(() => {
    if (typeof window === "undefined") return "en";
    try { const s = localStorage.getItem("locale"); if (s === "ml" || s === "kn") return s; } catch {}
    return "en";
  });
  const t = useMemo(() => TEXT[locale] || TEXT.en, [locale]);

  // Auto-request location on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLon(pos.coords.longitude); setGpsAccuracy(pos.coords.accuracy); },
      () => { setLat(10.8505); setLon(76.2711); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // The main flow: photo → classify → auto-submit
  const processPhoto = useCallback(async (file: File) => {
    setStep("processing");
    setStatusText(t.gettingLocation);
    setCapturedAt(new Date().toISOString());

    // Wait briefly for GPS if not ready
    await new Promise((r) => setTimeout(r, 500));
    setStatusText(t.classifying);

    // 1. AI Classification
    let aiCategory = "other";
    let aiConfidence = 0;
    let aiSummary = "";
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_BASE}/v1/reports/classify-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64, lat, lon }),
      });
      if (res.ok) {
        const data = await res.json();
        const top = data.top_3_categories?.[0];
        aiCategory = top?.category || "other";
        aiConfidence = data.confidence ?? 0;
        aiSummary = data.quick_summary || "";
      }
    } catch {
      // AI failed — user picks category
    }

    setCategory(aiCategory);
    setConfidence(aiConfidence);
    setSummary(aiSummary);

    // 2. If high confidence AND not "other" → auto-submit.
    //    Otherwise → ask user to confirm category first.
    if (aiConfidence >= AI_CONFIDENCE_THRESHOLD && aiCategory !== "other") {
      await submitReport(file, aiCategory);
    } else {
      // AI failed or low confidence — let user pick/confirm
      setStep("review");
    }
  }, [lat, lon, t]);

  const submitReport = useCallback(async (file: File, cat: string) => {
    setStep("submitting");
    setStatusText(t.uploading);

    try {
      // Upload media
      const uploadRes = await fetch(`${API_BASE}/v1/media/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: file.type.startsWith("video/") ? "video" : "image", file_ext: "jpg" }),
      });
      if (!uploadRes.ok) throw new Error("upload failed");
      const { upload_url, media_key } = await uploadRes.json();
      await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });

      // Create report
      const submitRes = await fetch(`${API_BASE}/v1/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: lat ?? 10.8505,
          lon: lon ?? 76.2711,
          category_final: cat,
          capture_origin: "camera",
          captured_at: capturedAt ?? new Date().toISOString(),
          gps_accuracy_m: gpsAccuracy,
          media_keys: [media_key],
          device_id: getDeviceId(),
        }),
      });
      if (!submitRes.ok) throw new Error("submit failed");
      const data = await submitRes.json();
      setResultId(data.public_id);
      setResultUrl(data.share_url || `${window.location.origin}/reports/${data.public_id}`);
      setStep("done");
    } catch (e) {
      setErrorMsg(String(e));
      setStep("error");
    }
  }, [lat, lon, capturedAt, gpsAccuracy, t]);

  const handleCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    processPhoto(file);
  }, [imageUrl, processPhoto]);

  const handleConfirmSubmit = useCallback(() => {
    if (!imageFile || !category) return;
    submitReport(imageFile, category);
  }, [imageFile, category, submitReport]);

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setStep("ready"); setImageUrl(null); setImageFile(null);
    setCategory(null); setConfidence(0); setSummary("");
    setResultId(""); setResultUrl(""); setErrorMsg("");
    setStatusText(""); setShowCategoryPicker(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const catIcon = category ? (CATEGORY_ICONS[category] || "\u{1F4CB}") : "";
  const catLabel = category ? (CATEGORY_LABELS[category] || category.replaceAll("_", " ")) : "";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />

      {/* ── STEP 1: Ready — big camera button ── */}
      {step === "ready" && (
        <div style={{
          display: "grid", placeItems: "center", gap: 20, padding: "40px 20px",
          background: "linear-gradient(145deg, #ecfdf5 0%, #f0f9ff 100%)",
          borderRadius: 20, border: "1px solid #d1fae5", textAlign: "center",
        }}>
          <div style={{ fontSize: 64 }}>{"\u{1F4F7}"}</div>
          <h2 style={{ margin: 0, fontSize: 22, color: "#0f766e" }}>{t.heroTitle}</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: 15, maxWidth: "32ch" }}>{t.heroSub}</p>
          <button onClick={() => fileRef.current?.click()} style={{
            padding: "16px 40px", borderRadius: 14, border: "none", fontSize: 18, fontWeight: 700,
            background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(13,148,136,0.35)", transition: "transform 0.15s",
          }}>
            {t.takePhoto}
          </button>
          {lat && <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
            GPS: {lat.toFixed(4)}, {lon?.toFixed(4)}
          </p>}
        </div>
      )}

      {/* ── STEP 2: Processing — spinner with photo preview ── */}
      {step === "processing" && (
        <div style={{
          display: "grid", gap: 16, padding: 20,
          background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
        }}>
          {imageUrl && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "2px solid #e2e8f0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Issue" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: 16,
            background: "#ecfdf5", borderRadius: 12,
          }}>
            <div style={{
              width: 24, height: 24, border: "3px solid #99f6e4", borderTopColor: "#0d9488",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ color: "#0f766e", fontWeight: 600, fontSize: 14 }}>{statusText}</span>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review — AI suggestion, user confirms ── */}
      {step === "review" && (
        <div style={{
          display: "grid", gap: 14, padding: 20,
          background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
        }}>
          {imageUrl && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "2px solid #e2e8f0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Issue" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
            </div>
          )}

          <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>{t.reviewTitle}</h3>

          {summary && (
            <p style={{ margin: 0, fontSize: 13, padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, borderLeft: "3px solid #0d9488", color: "#475569" }}>
              {summary}
            </p>
          )}

          {/* AI suggested category */}
          {!showCategoryPicker && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
              background: "#f8fafc", borderRadius: 12, border: "2px solid #0d9488",
            }}>
              <span style={{ fontSize: 28 }}>{catIcon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", textTransform: "capitalize" }}>{catLabel}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  AI confidence: {(confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}

          {/* Category picker (shown when user wants to change) */}
          {showCategoryPicker && (
            <div>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b" }}>{t.selectCategory}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {ALL_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => { setCategory(cat); setShowCategoryPicker(false); }} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
                    borderRadius: 10, border: category === cat ? "2px solid #0d9488" : "1.5px solid #e2e8f0",
                    background: category === cat ? "#ecfdf5" : "#fff", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, textAlign: "left",
                  }}>
                    <span>{CATEGORY_ICONS[cat] || "\u{1F4CB}"}</span>
                    {CATEGORY_LABELS[cat] || cat.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            <button onClick={handleConfirmSubmit} disabled={!category} style={{
              padding: "14px", borderRadius: 12, border: "none", fontSize: 16, fontWeight: 700,
              background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff", cursor: "pointer",
              boxShadow: "0 2px 10px rgba(13,148,136,0.3)",
            }}>
              {t.submit}
            </button>
            {!showCategoryPicker && (
              <button onClick={() => setShowCategoryPicker(true)} style={{
                padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}>
                {t.changeCategory}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 4: Submitting ── */}
      {step === "submitting" && (
        <div style={{
          display: "grid", placeItems: "center", gap: 16, padding: "40px 20px",
          background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", textAlign: "center",
        }}>
          <div style={{
            width: 48, height: 48, border: "4px solid #99f6e4", borderTopColor: "#0d9488",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ margin: 0, color: "#0f766e", fontWeight: 600, fontSize: 15 }}>{t.uploading}</p>
        </div>
      )}

      {/* ── STEP 5: Done — success! ── */}
      {step === "done" && (
        <div style={{
          display: "grid", placeItems: "center", gap: 16, padding: "32px 20px",
          background: "linear-gradient(145deg, #ecfdf5, #f0fdf4)", borderRadius: 16,
          border: "1px solid #86efac", textAlign: "center",
        }}>
          <div style={{ fontSize: 56 }}>{"\u2705"}</div>
          <h2 style={{ margin: 0, fontSize: 22, color: "#15803d" }}>{t.success}</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14, maxWidth: "36ch" }}>{t.successSub}</p>

          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
            background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
          }}>
            <span style={{ fontSize: 22 }}>{catIcon}</span>
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: "capitalize" }}>{catLabel}</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>&middot;</span>
            <span style={{ fontSize: 13, color: "#0d9488", fontWeight: 600 }}>{resultId}</span>
          </div>

          <div style={{ display: "grid", gap: 8, width: "100%", maxWidth: 280 }}>
            <Link href={resultUrl || "/"} style={{
              padding: "12px", borderRadius: 10, background: "#0d9488", color: "#fff",
              textDecoration: "none", fontWeight: 700, fontSize: 14, textAlign: "center",
            }}>
              {t.viewReport}
            </Link>
            <button onClick={reset} style={{
              padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0",
              background: "#fff", color: "#475569", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>
              {t.reportAnother}
            </button>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {step === "error" && (
        <div style={{
          display: "grid", placeItems: "center", gap: 14, padding: "32px 20px",
          background: "#fffbeb", borderRadius: 16, border: "1px solid #fcd34d", textAlign: "center",
        }}>
          <div style={{ fontSize: 48 }}>{"\u26A0\uFE0F"}</div>
          <h3 style={{ margin: 0, color: "#d97706" }}>{t.errorTitle}</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: "34ch" }}>{t.errorSub}</p>
          <button onClick={reset} style={{
            padding: "12px 24px", borderRadius: 10, border: "none",
            background: "#d97706", color: "#fff", cursor: "pointer", fontWeight: 700,
          }}>
            {t.tryAgain}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
