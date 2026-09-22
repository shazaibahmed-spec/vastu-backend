import { apiClient } from './client';
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
      const filename = payload.imageUri.split('/').pop() || 'room-capture.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match?.[1]?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      // React Native multipart file convention
      formData.append('image', {
        uri: payload.imageUri,
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

    const response = await apiClient.post<ApiResponse<AnalysisReport>>(
      '/analysis',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      },
    );

    return response.data.data;
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
