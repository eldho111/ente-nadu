"use client";

/**
 * WeddingWeather — forecast for the venue on the wedding day.
 *
 * Kodencherry is an open-air venue in the Kozhikode district (Western
 * Ghats foothills), which gets serious rainfall from June through
 * September and moderate showers well into November. For an outdoor
 * function that matters a lot.
 *
 * Data source: Open-Meteo (open-meteo.com/en/docs) — no key, CORS-open,
 * free for non-commercial use. Forecast horizon is 16 days. For dates
 * further out we surface a season hint instead of a forecast, so the
 * card is useful even when the wedding is months away.
 *
 * The fetch runs on every mount and every date change. It's a single
 * request per view; no polling — nothing here changes minute to minute.
 */

import { useEffect, useMemo, useState } from "react";

// Kodencherry, Kozhikode district, Kerala.
// 11.4778° N, 75.9247° E — approximate town centre.
const KODENCHERRY = {
  lat: 11.4778,
  lon: 75.9247,
  name: "Kodencherry",
  region: "Kozhikode district, Kerala",
};

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

type DailyForecast = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainProb: number;
  rainSum: number;
  windMax: number;
};

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; forecast: DailyForecast }
  | { kind: "too_far"; daysAway: number }
  | { kind: "past" }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/** WMO weather-code → { icon, label } for what the family cares about. */
function codeToLabel(code: number): { icon: string; label: string; tone: "sun" | "cloud" | "rain" | "storm" | "fog" } {
  if (code === 0) return { icon: "☀", label: "Clear sky", tone: "sun" };
  if (code === 1) return { icon: "🌤", label: "Mainly clear", tone: "sun" };
  if (code === 2) return { icon: "⛅", label: "Partly cloudy", tone: "cloud" };
  if (code === 3) return { icon: "☁", label: "Overcast", tone: "cloud" };
  if (code === 45 || code === 48) return { icon: "🌫", label: "Foggy", tone: "fog" };
  if (code >= 51 && code <= 55) return { icon: "🌦", label: "Drizzle", tone: "rain" };
  if (code >= 61 && code <= 65) return { icon: "🌧", label: "Rain", tone: "rain" };
  if (code >= 66 && code <= 67) return { icon: "🌧", label: "Freezing rain", tone: "rain" };
  if (code >= 71 && code <= 75) return { icon: "❄", label: "Snow", tone: "cloud" };
  if (code >= 80 && code <= 82) return { icon: "🌦", label: "Rain showers", tone: "rain" };
  if (code === 85 || code === 86) return { icon: "🌨", label: "Snow showers", tone: "cloud" };
  if (code === 95) return { icon: "⛈", label: "Thunderstorm", tone: "storm" };
  if (code === 96 || code === 99) return { icon: "⛈", label: "Thunderstorm with hail", tone: "storm" };
  return { icon: "◌", label: "Unknown", tone: "cloud" };
}

/**
 * Kerala rainfall seasons in plain English. Used as the fallback when the
 * date is beyond the forecast horizon (Open-Meteo caps at 16 days). Better
 * than showing nothing.
 */
function seasonHint(monthOneIndexed: number): { headline: string; note: string } {
  if (monthOneIndexed >= 6 && monthOneIndexed <= 9) {
    return {
      headline: "Southwest monsoon — heavy, persistent rain",
      note: "Kodencherry sits on the Western Ghats. Expect frequent downpours; plan a covered backup even if the day looks dry.",
    };
  }
  if (monthOneIndexed === 10 || monthOneIndexed === 11) {
    return {
      headline: "Northeast retreat — occasional heavy showers",
      note: "Thunderstorms are common in the late afternoon. Cover the mandapam or shift the ceremony earlier in the day.",
    };
  }
  if (monthOneIndexed === 12 || monthOneIndexed <= 2) {
    return {
      headline: "Cool and dry",
      note: "Best window for an outdoor Kerala wedding. Overnight lows into the low 20s; keep light shawls for elders.",
    };
  }
  return {
    headline: "Pre-monsoon — hot, humid, occasional squalls",
    note: "March–May in Kerala gets muggy. Consider fans in the pandal and hydration at the mandapam.",
  };
}

function targetIsoParts(dateISO: string): { yearMonthDay: string; monthOneIndexed: number } | null {
  if (!dateISO) return null;
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return { yearMonthDay: `${y}-${pad(m)}-${pad(d)}`, monthOneIndexed: m };
}

function daysFromToday(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  return Math.round((target.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
}

export default function WeddingWeather({ dateISO }: { dateISO: string }) {
  const [state, setState] = useState<FetchState>({ kind: "idle" });

  const parts = useMemo(() => targetIsoParts(dateISO), [dateISO]);

  useEffect(() => {
    if (!parts) {
      setState({ kind: "empty" });
      return;
    }
    const days = daysFromToday(parts.yearMonthDay);
    if (days < 0) {
      setState({ kind: "past" });
      return;
    }
    if (days > 16) {
      setState({ kind: "too_far", daysAway: days });
      return;
    }

    setState({ kind: "loading" });
    const controller = new AbortController();

    const url = new URL(OPEN_METEO);
    url.searchParams.set("latitude", String(KODENCHERRY.lat));
    url.searchParams.set("longitude", String(KODENCHERRY.lon));
    url.searchParams.set("timezone", "Asia/Kolkata");
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set(
      "daily",
      [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "precipitation_sum",
        "wind_speed_10m_max",
      ].join(","),
    );

    fetch(url.toString(), { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const times: string[] = j?.daily?.time || [];
        const idx = times.indexOf(parts.yearMonthDay);
        if (idx < 0) {
          setState({ kind: "error", message: "Forecast day missing from response." });
          return;
        }
        setState({
          kind: "ready",
          forecast: {
            date: parts.yearMonthDay,
            weatherCode: Number(j.daily.weather_code?.[idx] ?? 0),
            tempMax: Number(j.daily.temperature_2m_max?.[idx] ?? 0),
            tempMin: Number(j.daily.temperature_2m_min?.[idx] ?? 0),
            rainProb: Number(j.daily.precipitation_probability_max?.[idx] ?? 0),
            rainSum: Number(j.daily.precipitation_sum?.[idx] ?? 0),
            windMax: Number(j.daily.wind_speed_10m_max?.[idx] ?? 0),
          },
        });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setState({ kind: "error", message: err?.message || "Fetch failed" });
      });

    return () => controller.abort();
  }, [parts]);

  return (
    <div className="wWeather">
      <div className="wWeatherHead">
        <div className="wCdLabel">Weather · {KODENCHERRY.name}</div>
        <div className="wWeatherRegion">{KODENCHERRY.region}</div>
      </div>

      {state.kind === "empty" ? (
        <div className="wCdEmpty">Set a wedding date in Settings to see the forecast.</div>
      ) : null}

      {state.kind === "past" ? (
        <div className="wCdEmpty">The wedding day has passed.</div>
      ) : null}

      {state.kind === "loading" || state.kind === "idle" ? (
        <div className="wWeatherMuted">Fetching forecast…</div>
      ) : null}

      {state.kind === "error" ? (
        <div className="wWeatherMuted">Couldn&rsquo;t reach the forecast service ({state.message}).</div>
      ) : null}

      {state.kind === "too_far" ? (() => {
        const hint = seasonHint(parts?.monthOneIndexed ?? new Date().getMonth() + 1);
        return (
          <div className="wWeatherSeason">
            <div className="wWeatherSeasonHead">{hint.headline}</div>
            <div className="wWeatherSeasonNote">{hint.note}</div>
            <div className="wWeatherFineprint">
              {state.daysAway} days away — precise forecast opens 16 days before the day.
            </div>
          </div>
        );
      })() : null}

      {state.kind === "ready" ? (
        <>
          <div className="wWeatherMain">
            <div className={`wWeatherIcon wTone-${codeToLabel(state.forecast.weatherCode).tone}`}>
              {codeToLabel(state.forecast.weatherCode).icon}
            </div>
            <div className="wWeatherBody">
              <div className="wWeatherHeadline">
                {codeToLabel(state.forecast.weatherCode).label}
              </div>
              <div className="wWeatherTemps">
                <span className="wWeatherHigh">{Math.round(state.forecast.tempMax)}°</span>
                <span className="wWeatherSep">/</span>
                <span className="wWeatherLow">{Math.round(state.forecast.tempMin)}°</span>
              </div>
            </div>
          </div>
          <div className="wWeatherStats">
            <div>
              <span className="wWeatherStatLabel">Rain chance</span>
              <span className="wWeatherStatValue">
                {Math.round(state.forecast.rainProb)}%
              </span>
            </div>
            <div>
              <span className="wWeatherStatLabel">Rainfall</span>
              <span className="wWeatherStatValue">
                {state.forecast.rainSum.toFixed(1)} mm
              </span>
            </div>
            <div>
              <span className="wWeatherStatLabel">Wind</span>
              <span className="wWeatherStatValue">
                {Math.round(state.forecast.windMax)} km/h
              </span>
            </div>
          </div>
          {state.forecast.rainProb >= 50 ? (
            <div className="wWeatherAdvice wWeatherAdvice-rain">
              ⚠ High chance of rain — plan a covered mandapam or a canopy backup.
            </div>
          ) : state.forecast.rainProb >= 25 ? (
            <div className="wWeatherAdvice wWeatherAdvice-warn">
              Some rain possible. Keep umbrellas at the entrance.
            </div>
          ) : (
            <div className="wWeatherAdvice wWeatherAdvice-ok">
              Low rain risk — outdoor ceremony looks safe.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
