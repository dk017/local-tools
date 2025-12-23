import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { v4 as uuidv4 } from 'uuid';
import { IS_TAURI, API_BASE_URL } from '../config';

export interface PythonResponse {
    type: 'progress' | 'result';
    request_id: string;
    status?: 'success' | 'error';
    data?: any;
    error?: any;
    progress?: number;
    message?: string;
}

const isFile = (val: any) => typeof File !== 'undefined' && val instanceof File;

export const usePython = () => {
    const [, setResponses] = useState<Record<string, PythonResponse>>({});
    const [progress, setProgress] = useState<Record<string, { percent: number; message: string }>>({});

    useEffect(() => {
        if (!IS_TAURI) return;

        const unlistenPromise = listen<PythonResponse>('python-event', (event) => {
            const payload = event.payload;
            if (payload.type === 'progress') {
                setProgress((prev) => ({
                    ...prev,
                    [payload.request_id]: {
                        percent: payload.progress || 0,
                        message: payload.message || '',
                    },
                }));
            } else if (payload.type === 'result') {
                setResponses((prev) => ({
                    ...prev,
                    [payload.request_id]: payload,
                }));
            }
        });

        return () => {
            unlistenPromise.then((f) => f());
        };
    }, []);

    const execute = useCallback(async (module: string, action: string, payload: any) => {
        const requestId = uuidv4();

        // Initialize progress
        setProgress((prev) => ({
            ...prev,
            [requestId]: { percent: 0, message: 'Starting...' },
        }));

        if (IS_TAURI) {
            // --- DESKTOP MODE (Tauri Sidecar) ---
            try {
                await invoke('invoke_python', {
                    module,
                    action,
                    payload,
                    requestId,
                });

                // Return a promise that resolves when the result comes back via event
                return new Promise<any>((resolve, reject) => {
                    let timeoutId: any;
                    const checkInterval = setInterval(() => {
                        setResponses((currentResponses) => {
                            if (currentResponses[requestId]) {
                                clearInterval(checkInterval);
                                clearTimeout(timeoutId);
                                const res = currentResponses[requestId];
                                if (res.status === 'success') {
                                    resolve(res.data);
                                } else {
                                    reject(res.error);
                                }
                                // Cleanup to save memory
                                const newResponses = { ...currentResponses };
                                delete newResponses[requestId];
                                return newResponses;
                            }
                            return currentResponses;
                        });
                    }, 100);

                    // Timeout after 60 seconds (increased for heavy tasks like PDF/Image processing)
                    timeoutId = setTimeout(() => {
                        clearInterval(checkInterval);
                        // Clean up response listener placeholder if needed (optional)
                        reject(new Error("Backend request timed out (60s). Sidecar may be offline or busy."));
                    }, 60000);
                });

            } catch (e) {
                console.error("Failed to invoke python:", e);
                throw e;
            }
        } else {
            // --- WEB MODE (HTTP API) ---
            try {
                // Check if payload contains files
                const hasFiles = Object.values(payload).some(isFile);

                let body;
                let headers: Record<string, string> = {};

                if (hasFiles) {
                    const formData = new FormData();
                    formData.append('module', module);
                    formData.append('action', action);
                    // Append simplified payload JSON
                    // Files need to be appended separately
                    Object.keys(payload).forEach(key => {
                        if (isFile(payload[key])) {
                            formData.append(key, payload[key]);
                        } else {
                            formData.append(key, JSON.stringify(payload[key]));
                        }
                    });
                    body = formData;
                } else {
                    headers = { 'Content-Type': 'application/json' };
                    body = JSON.stringify({ module, action, payload });
                }

                const response = await fetch(`${API_BASE_URL}/api/py-invoke`, {
                    method: 'POST',
                    headers,
                    body
                });

                const data = await response.json();
                if (data.status === 'success') {
                    return data.data;
                } else {
                    throw data.error;
                }
            } catch (e) {
                console.error("Web API failed:", e);
                throw e;
            }
        }
    }, []);

    return { execute, progress };
};
