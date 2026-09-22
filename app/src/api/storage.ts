import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItemAsync(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('Storage read error:', e);
      return null;
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage delete error:', e);
    }
  },
};
