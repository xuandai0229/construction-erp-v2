/**
 * Mobile Environment Configuration
 */

const DEFAULT_ORIGIN = 'http://127.0.0.1:3000';

export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
export const API_V1_BASE_URL = `${API_ORIGIN}/api/v1`;
export const API_TIMEOUT_MS = 15000;
