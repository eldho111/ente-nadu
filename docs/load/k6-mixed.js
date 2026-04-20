import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost";
const DEVICE_PREFIX = __ENV.DEVICE_PREFIX || "k6-device";

const ONE_PIXEL_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBg1WS9aIAAAAASUVORK5CYII=";

export const options = {
  scenarios: {
    mixed_load: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 120),
      timeUnit: "1s",
      duration: __ENV.DURATION || "5m",
      preAllocatedVUs: Number(__ENV.PRE_VUS || 250),
      maxVUs: Number(__ENV.MAX_VUS || 1200),
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1800"],
    "http_req_duration{name:classify_preview}": ["p(95)<2500"],
  },
};

function createReportPayload(vu, iter) {
  return JSON.stringify({
    lat: 12.9716 + Math.random() * 0.03,
    lon: 77.5946 + Math.random() * 0.03,
    category_final: "pothole",
    description_user: "k6 load test report",
    media_keys: [`uploads/load-test/${vu}-${iter}.jpg`],
    device_id: `${DEVICE_PREFIX}-${vu}`,
  });
}

function classifyPreview() {
  return http.post(
    `${BASE_URL}/v1/reports/classify-preview`,
    JSON.stringify({ image_base64: ONE_PIXEL_BASE64, lat: 12.9716, lon: 77.5946 }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "classify_preview" },
    },
  );
}

function submitReport(vu, iter) {
  return http.post(`${BASE_URL}/v1/reports`, createReportPayload(vu, iter), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "submit_report" },
  });
}

function readReports() {
  return http.get(`${BASE_URL}/v1/reports?page=1&page_size=50`, { tags: { name: "reports_list" } });
}

export default function () {
  const sample = Math.random();
  let res;
  if (sample < 0.75) {
    res = readReports();
  } else if (sample < 0.9) {
    res = classifyPreview();
  } else {
    res = submitReport(__VU, __ITER);
  }

  check(res, {
    "status is < 500": (r) => r.status < 500,
  });
  sleep(0.3);
}

