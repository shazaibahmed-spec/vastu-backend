import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage as SecureStore } from './storage';
import { getBaseUrl } from './config';

const TOKEN_KEY = 'vastu_access_token';
const REFRESH_TOKEN_KEY = 'vastu_refresh_token';

const SENSITIVE_KEYS = new Set([
  'password',
  'refreshtoken',
  'token',
  'authorization',
  'accesstoken',
  'secret',
]);

/**
 * Parses React Native FormData (_parts array) for clean console debugging
 */
function formatFormDataForLog(formData: any): Record<string, any> {
  const result: Record<string, any> = {};
  if (!formData) return result;

  try {
    if (Array.isArray(formData._parts)) {
      for (const item of formData._parts) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const [key, value] = item;
        if (value && typeof value === 'object' && value.uri) {
          result[key] = `[File: ${value.name || 'unnamed'} (${value.type || 'unknown'}, uri: ${String(value.uri).substring(0, 35)}...)]`;
        } else {
          result[key] = value;
        }
      }
    } else if (typeof (formData as any).entries === 'function') {
      for (const [key, value] of (formData as any).entries()) {
        if (value && typeof value === 'object' && (value.name || value.uri)) {
          result[key] = `[File: ${value.name || 'file'}]`;
        } else {
          result[key] = value;
        }
      }
    }
  } catch (e) {
    result._raw = '[FormData unable to parse]';
  }
  return result;
}

/**
 * Deeply sanitizes payloads for console logging:
 * - Formats FormData objects into readable key-values
 * - Masks sensitive fields (password, tokens, etc.)
 * - Truncates excessively long strings (e.g. base64)
 */
function sanitizeForLog(data: any, depth = 0): any {
  if (depth > 4) return '[Max Depth]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (data.length > 500) {
      return `${data.substring(0, 100)}... [truncated ${data.length} chars]`;
    }
    return data;
  }

  if (typeof data !== 'object') return data;

  // React Native FormData detection
  if (
    (typeof FormData !== 'undefined' && data instanceof FormData) ||
    Array.isArray((data as any)?._parts)
  ) {
    return formatFormDataForLog(data);
  }

  if (Array.isArray(data)) {
    if (data.length > 15) {
      return [
        ...data.slice(0, 15).map((item) => sanitizeForLog(item, depth + 1)),
        `... [${data.length - 15} more items]`,
      ];
    }
    return data.map((item) => sanitizeForLog(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = sanitizeForLog(value, depth + 1);
    }
  }
  return sanitized;
}

export const apiClient = axios.create({
  timeout: 60000,
});

// Request interceptor: Dynamic Base URL, Token attachment & Console Logging
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = getBaseUrl();
    (config as any)._startTime = Date.now();

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        if (typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // SecureStore not available in web development mode
    }

    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    const method = config.method?.toUpperCase() || 'GET';
    const logDetails: Record<string, any> = {};

    if (config.params && Object.keys(config.params).length > 0) {
      logDetails.params = config.params;
    }
    if (config.data !== undefined) {
      logDetails.data = sanitizeForLog(config.data);
    }

    console.log(
      `[API Request] 🚀 ${method} ${fullUrl}`,
      Object.keys(logDetails).length > 0 ? logDetails : '',
    );

    return config;
  },
  (error) => {
    console.warn('[API Request Error] ❌', error.message || error);
    return Promise.reject(error);
  },
);

// Response interceptor: Console Logging & Token Refresh rotation
apiClient.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any)?._startTime;
    const duration = startTime ? `${Date.now() - startTime}ms` : '';
    const fullUrl = `${response.config.baseURL || ''}${response.config.url || ''}`;
    const method = response.config.method?.toUpperCase() || 'GET';

    console.log(
      `[API Response] ✅ ${response.status} ${method} ${fullUrl} (${duration})`,
      sanitizeForLog(response.data),
    );

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
          _startTime?: number;
        })
      | undefined;

    const startTime = originalRequest?._startTime;
    const duration = startTime ? `${Date.now() - startTime}ms` : '';
    const fullUrl = originalRequest
      ? `${originalRequest.baseURL || ''}${originalRequest.url || ''}`
      : 'Unknown URL';
    const method = originalRequest?.method?.toUpperCase() || 'GET';
    const status = error.response?.status || 'NETWORK_ERROR';

    console.warn(
      `[API Error] ❌ ${status} ${method} ${fullUrl} (${duration})`,
      {
        message: error.message,
        response: sanitizeForLog(error.response?.data),
      },
    );

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('[API Auth] 🔄 Attempting access token refresh...');
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${getBaseUrl()}/auth/refresh`,
            { refreshToken },
          );

          const { accessToken, refreshToken: newRefresh } =
            refreshResponse.data.data;

          await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
          if (newRefresh) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          console.log('[API Auth] 🔑 Token refresh successful, retrying original request');
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('[API Auth] ⚠️ Token refresh failed, clearing session');
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    }

    return Promise.reject(error);
  },
);

export const saveAuthTokens = async (
  accessToken: string,
  refreshToken: string,
) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (e) {
    console.warn('SecureStore error saving tokens:', e);
  }
};

export const clearAuthTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.warn('SecureStore error clearing tokens:', e);
  }
};

export const getStoredAccessToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};
