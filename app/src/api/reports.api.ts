import { getBaseUrl } from './config';

export const reportsApi = {
  /**
   * Generates the direct download / preview URL for an analysis PDF certificate.
   */
  getPdfUrl: (analysisId: string): string => {
    return `${getBaseUrl()}/reports/${analysisId}/pdf`;
  },
};
