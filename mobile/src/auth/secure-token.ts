import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'construction_erp_v2_mobile_auth_token';

/**
 * Platform-safe token storage abstraction wrapping Expo SecureStore.
 * On Web platform fallback (if run in browser dev mode), uses memory/session storage.
 */
let memoryTokenStore: string | null = null;

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return memoryTokenStore;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('[SecureStore] Failed to read token from secure storage:', error);
    return memoryTokenStore;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    memoryTokenStore = token;
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.warn('[SecureStore] Failed to save token to secure storage:', error);
  }
}

export async function deleteToken(): Promise<void> {
  try {
    memoryTokenStore = null;
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('[SecureStore] Failed to delete token from secure storage:', error);
  }
}
