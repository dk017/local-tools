"use client";

import React, { useEffect, useState } from 'react';
import ActivationScreen from './ActivationScreen';

// Helper to detect Tauri environment
const isTauri = () => {
    return typeof window !== 'undefined' && '__TAURI__' in window;
};

export default function ActivationWrapper({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkLicense = async () => {
        try {
            // If we are on the web, we don't need to check license (Free Trial logic)
            // BUT, checking window.__TAURI__ might not be enough if we want "Web" to be unaware.
            // Assuming this code runs in both.
            if (!isTauri()) {
                setLoading(false);
                return;
            }

            const res = await fetch("http://127.0.0.1:8000/license/status");
            const data = await res.json();

            if (data.valid) {
                setIsLocked(false);
            } else {
                setIsLocked(true);
            }
        } catch (e) {
            console.error("License check failed:", e);
            // In case of backend failure, might default to locked or unlocked?
            // For now, unlocked to avoid blocking dev if backend is down, 
            // but in prod, this should maybe be strict.
            // Actually, if backend is down, app is useless anyway.
            setIsLocked(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkLicense();
        // Optional: Poll every few minutes?
    }, []);

    if (loading) {
        // Simple loading state
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    }

    if (isLocked) {
        return <ActivationScreen onActivated={() => checkLicense()} />;
    }

    return <>{children}</>;
}
