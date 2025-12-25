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
            if (!isTauri()) {
                setLoading(false);
                setIsLocked(false);
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
        // Check immediately if we're on web (no async needed)
        if (!isTauri()) {
            setLoading(false);
            setIsLocked(false);
            return;
        }
        checkLicense();
        // Optional: Poll every few minutes?
    }, []);

    if (loading) {
        // Better loading state with spinner
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground text-sm">Initializing...</p>
                </div>
            </div>
        );
    }

    if (isLocked) {
        return <ActivationScreen onActivated={() => checkLicense()} />;
    }

    return <>{children}</>;
}
