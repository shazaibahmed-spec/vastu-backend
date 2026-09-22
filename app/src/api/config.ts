import { NativeModules, Platform } from 'react-native';

// Dynamically resolve dev server host (works on both Simulators and Real Devices over Wi-Fi)
const getDevServerHost = (): string => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    // scriptURL format: "http://192.168.1.32:8081/index.bundle?platform=ios..."
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    if (match && match[1]) {
      const hostname = match[1];
      // If host is not localhost/127.0.0.1, it is the LAN IP reachable by physical device
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return hostname;
      }
    }
  }
  // Fallback to LAN IP for physical device testing
  return '192.168.1.32';
};

// Production Cloud Backend URL (Render + Supabase)
const PRODUCTION_URL = 'https://vastu-backend-udcy.onrender.com/api/v1';

const getDefaultHost = (): string => {
  if (PRODUCTION_URL) {
    return PRODUCTION_URL;
  }
  const host = getDevServerHost();
  return `http://${host}:3001/api/v1`;
};

export const API_CONFIG = {
  baseUrl: getDefaultHost(),
  timeoutMs: 60000,
};

export let currentBaseUrl = API_CONFIG.baseUrl;

export const setCustomApiUrl = (url: string) => {
  currentBaseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
};

export const getBaseUrl = () => {
  // Always evaluate dynamically in development if not explicitly customized
  if (currentBaseUrl === API_CONFIG.baseUrl) {
    return getDefaultHost();
  }
  return currentBaseUrl;
};

