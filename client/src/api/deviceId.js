// In a real Electron/React Native build, replace this with a hardware-backed id
// (e.g. machine UUID via node-machine-id, or device id via react-native-device-info).
// For the web/PWA scaffold, a persisted random id is good enough to demonstrate the flow.
export function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      id = "dev-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem("deviceId", id);
  }
  return id;
}
