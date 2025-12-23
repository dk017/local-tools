export const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const envUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = envUrl !== undefined ? envUrl : 'http://127.0.0.1:8000';
