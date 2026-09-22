import { apiClient } from './client';
import { ApiResponse, VastuPrinciple } from './types';

export const vastuApi = {
  /**
   * Fetches the authentic daily Vastu principle from backend API, localized in the requested language
   */
  getDailyPrinciple: async (offset = 0, lang?: string): Promise<VastuPrinciple> => {
    const response = await apiClient.get<ApiResponse<VastuPrinciple>>(
      '/vastu/daily-principle',
      {
        params: {
          ...(offset > 0 ? { offset } : {}),
          ...(lang ? { lang } : {}),
        },
      },
    );
    return response.data.data;
  },
};
