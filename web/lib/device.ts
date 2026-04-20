export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "server";
  }
  try {
    let id = localStorage.getItem("device_id_v1");
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("device_id_v1", id);
    }
    return id;
  } catch {
    return `device-fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
