import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { DEFAULT_LANGUAGE, LanguageMeta, SUPPORTED_LANGUAGES, SupportedLanguage } from './types';

import bn from './locales/bn.json';
import en from './locales/en.json';
import gu from './locales/gu.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import pa from './locales/pa.json';
import ta from './locales/ta.json';
import te from './locales/te.json';

const dictionaries: Record<SupportedLanguage, any> = {
  en,
  hi,
  ta,
  te,
  kn,
  ml,
  bn,
  gu,
  mr,
  pa,
};

import { FEATURES } from '../config/features';

const STORAGE_KEY = '@vastu_user_language';

interface TranslationState {
  language: SupportedLanguage;
  isInitialized: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  initLanguage: () => Promise<void>;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  language: DEFAULT_LANGUAGE,
  isInitialized: false,

  setLanguage: async (lang: SupportedLanguage) => {
    if (!FEATURES.ENABLE_MULTILINGUAL) {
      set({ language: DEFAULT_LANGUAGE });
      return;
    }
    set({ language: lang });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      // Sync with backend if authenticated
      apiClient.patch('/users/me/language', { languageCode: lang }).catch(() => {
        // Silently ignore if unauthenticated or offline
      });
    } catch (e) {
      // Storage error
    }
  },

  initLanguage: async () => {
    if (get().isInitialized) return;
    if (!FEATURES.ENABLE_MULTILINGUAL) {
      set({ language: DEFAULT_LANGUAGE, isInitialized: true });
      AsyncStorage.setItem(STORAGE_KEY, DEFAULT_LANGUAGE).catch(() => {});
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && Object.keys(dictionaries).includes(stored)) {
        set({ language: stored as SupportedLanguage, isInitialized: true });
        return;
      }
    } catch (e) {
      // Ignore storage error
    }
    set({ isInitialized: true });
  },
}));

function resolveKey(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function useTranslation() {
  const language = useTranslationStore((state) => state.language);
  const setLanguage = useTranslationStore((state) => state.setLanguage);

  const effectiveLanguage = FEATURES.ENABLE_MULTILINGUAL ? language : DEFAULT_LANGUAGE;

  const t = (path: string, params?: Record<string, string | number>): string => {
    const currentDict = dictionaries[effectiveLanguage] || dictionaries[DEFAULT_LANGUAGE];
    let translation = resolveKey(currentDict, path);

    // Fallback to English if not found in target language
    if (!translation && effectiveLanguage !== DEFAULT_LANGUAGE) {
      translation = resolveKey(dictionaries[DEFAULT_LANGUAGE], path);
    }

    if (!translation) {
      return path;
    }

    if (params) {
      return Object.entries(params).reduce((acc, [key, val]) => {
        return acc.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
      }, translation);
    }

    return translation;
  };

  const currentLanguageMeta: LanguageMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === effectiveLanguage) ||
    SUPPORTED_LANGUAGES[0];

  return {
    t,
    language: effectiveLanguage,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    currentLanguageMeta,
    isMultilingualEnabled: FEATURES.ENABLE_MULTILINGUAL,
  };
}
