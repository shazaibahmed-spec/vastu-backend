import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth.api';
import { getStoredAccessToken } from '../api/client';
import { User } from '../api/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'dev@vastu.local',
    name: 'Guest Explorer',
    role: 'USER',
    createdAt: new Date().toISOString(),
  },
  isAuthenticated: true,
  isGuest: true,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user } = await authApi.login(email, password);
      await AsyncStorage.removeItem('@vastu_is_guest').catch(() => {});
      set({ user, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { user } = await authApi.register(email, password, name);
      await AsyncStorage.removeItem('@vastu_is_guest').catch(() => {});
      set({ user, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  continueAsGuest: async () => {
    await AsyncStorage.setItem('@vastu_is_guest', 'true').catch(() => {});
    set({
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev@vastu.local',
        name: 'Guest Explorer',
        role: 'USER',
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isGuest: true,
      isLoading: false,
    });
  },

  logout: async () => {
    await AsyncStorage.removeItem('@vastu_is_guest').catch(() => {});
    await authApi.logout();
    set({ user: null, isAuthenticated: false, isGuest: false });
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const token = await getStoredAccessToken();
      if (token) {
        try {
          const user = await authApi.getProfile();
          set({ user, isAuthenticated: true, isGuest: false, isLoading: false });
        } catch {
          set({ isAuthenticated: true, isGuest: false, isLoading: false });
        }
        return;
      }
      const isGuest = await AsyncStorage.getItem('@vastu_is_guest');
      if (isGuest === 'true') {
        set({
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'dev@vastu.local',
            name: 'Guest Explorer',
            role: 'USER',
            createdAt: new Date().toISOString(),
          },
          isAuthenticated: true,
          isGuest: true,
          isLoading: false,
        });
        return;
      }
      set({ isAuthenticated: false, isLoading: false });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
