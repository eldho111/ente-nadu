import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost";

export const options = {
  scenarios: {
    read_heavy: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 1000),
      duration: __ENV.DURATION || "5m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1200"],
  },
};

function weightedReadRequest() {
  const sample = Math.random();
  if (sample < 0.6) {
    return http.get(`${BASE_URL}/v1/reports?page=1&page_size=50`, { tags: { name: "reports_list" } });
  }
  if (sample < 0.85) {
    return http.get(`${BASE_URL}/v1/reports/metrics/wards`, { tags: { name: "ward_metrics" } });
  }
  if (sample < 0.95) {
    return http.get(`${BASE_URL}/app`, { tags: { name: "app_shell" } });
  }
  return http.get(`${BASE_URL}/`, { tags: { name: "web_home" } });
}

export default function () {
  const res = weightedReadRequest();
  check(res, {
    "status is < 500": (r) => r.status < 500,
  });
  sleep(0.2);
}

