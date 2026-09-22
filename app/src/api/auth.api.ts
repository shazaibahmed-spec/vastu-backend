import { apiClient, clearAuthTokens, saveAuthTokens } from './client';
import { ApiResponse, AuthTokens, User } from './types';

export const authApi = {
  login: async (
    email: string,
    password: string,
  ): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await apiClient.post<
      ApiResponse<{ user: User; tokens: AuthTokens }>
    >('/auth/login', { email, password });

    const { user, tokens } = response.data.data;
    await saveAuthTokens(tokens.accessToken, tokens.refreshToken);
    return { user, tokens };
  },

  register: async (
    email: string,
    password: string,
    name?: string,
  ): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await apiClient.post<
      ApiResponse<{ user: User; tokens: AuthTokens }>
    >('/auth/register', { email, password, name });

    const { user, tokens } = response.data.data;
    await saveAuthTokens(tokens.accessToken, tokens.refreshToken);
    return { user, tokens };
  },

  logout: async (): Promise<void> => {
    await clearAuthTokens();
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/users/profile');
    return response.data.data;
  },
};

