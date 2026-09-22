import { Platform } from 'react-native';
import { apiClient } from './client';
import { getBaseUrl } from './config';
import { storage as SecureStore } from './storage';
import {
  AnalysisReport,
  AnalysisSummaryCard,
  ApiResponse,
  CompassDirection,
  DirectionSource,
  PaginatedResult,
  RoomType,
} from './types';

export interface CreateAnalysisPayload {
  imageUri?: string;
  roomType: RoomType;
  directionSource: DirectionSource;
  compassHeading?: number;
  userSelectedDirection?: CompassDirection;
  notes?: string;
  language?: string;
}

export const analysisApi = {
  /**
   * Uploads room capture and executes end-to-end Vastu analysis pipeline
   */
  createAnalysis: async (
    payload: CreateAnalysisPayload,
  ): Promise<AnalysisReport> => {
    const formData = new FormData();

    if (payload.imageUri) {
      const rawUri = payload.imageUri;
      const filename = rawUri.split('/').pop() || 'room-capture.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'jpg';
      const mimeType =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      // iOS requires file:// URI scheme for native RCTNetworking file stream
      const fileUri =
        Platform.OS === 'ios' && !rawUri.startsWith('file://')
          ? `file://${rawUri}`
          : rawUri;

      formData.append('image', {
        uri: fileUri,
        name: filename,
        type: mimeType,
      } as any);
    }

    formData.append('roomType', payload.roomType);
    formData.append('directionSource', payload.directionSource);

    if (payload.compassHeading !== undefined && payload.compassHeading !== null) {
      formData.append('compassHeading', String(payload.compassHeading));
    }

    if (payload.userSelectedDirection) {
      formData.append('userSelectedDirection', payload.userSelectedDirection);
    }

    if (payload.notes) {
      formData.append('notes', payload.notes);
    }

    if (payload.language) {
      formData.append('language', payload.language);
    }

    const token = await SecureStore.getItemAsync('vastu_access_token').catch(() => null);
    const targetUrl = `${getBaseUrl()}/analysis`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log(`[Upload API] 🚀 POST ${targetUrl} (via native fetch)`);

    // Use native fetch instead of Axios for multipart upload on iOS:
    // Axios uses XMLHttpRequest + piped NSInputStream which causes BoringSSL
    // to trip "SSLV3_ALERT_BAD_RECORD_MAC" (alert 20) on iOS during HTTP/2 upload.
    // Native fetch uses NSURLSessionUploadTask which streams directly and reliably.
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        (Array.isArray(json?.message) ? json.message.join(', ') : json?.message) ||
        json?.error ||
        `Server returned ${res.status}`;
      throw new Error(msg);
    }

    return json.data;
  },

  /**
   * Fetch full analysis report by ID, optionally in a requested language
   */
  getAnalysisById: async (id: string, lang?: string): Promise<AnalysisReport> => {
    const params: Record<string, any> = {};
    if (lang) params.lang = lang;
    const response = await apiClient.get<ApiResponse<AnalysisReport>>(
      `/analysis/${id}`,
      { params },
    );
    return response.data.data;
  },

  /**
   * Fetch paginated list of previous analyses
   */
  listAnalyses: async (
    page = 1,
    limit = 20,
    roomType?: RoomType,
  ): Promise<PaginatedResult<AnalysisSummaryCard>> => {
    const params: Record<string, any> = { page, limit };
    if (roomType) params.roomType = roomType;

    const response = await apiClient.get<
      ApiResponse<PaginatedResult<AnalysisSummaryCard>>
    >('/analysis', { params });
    return response.data.data;
  },

  /**
   * Soft-delete an analysis
   */
  deleteAnalysis: async (id: string): Promise<void> => {
    await apiClient.delete(`/analysis/${id}`);
  },
};
