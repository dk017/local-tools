import React, { useEffect, useState } from 'react';
import ActivationScreen from './ActivationScreen';
import { usePython } from '../hooks/usePython';

export default function ActivationWrapper({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);

    const { execute } = usePython();

    // Debug log
    useEffect(() => {
        console.log("DEBUG: ActivationWrapper mounted. Execute available:", !!execute);
    }, [execute]);

    const checkLicense = async () => {
        console.log("DEBUG: License Check BYPASSED for Testing.");
        // Force Unlock
        setIsLocked(false);
        setLoading(false);
        return;

        /* 
        console.log("DEBUG: Calling Licensing Backend...");
        try {
            // Using Desktop Sidecar Native Communication
            const data = await execute("licensing", "status", {});
            console.log("DEBUG: License Backend Response:", data);

            if (data && data.valid) {
                setIsLocked(false);
            } else {
                setIsLocked(true);
            }
        } catch (e) {
            console.error("License check failed:", e);
            // In production, failure usually means sidecar issue or no license.
            // Lock to be safe.
            setIsLocked(true);
        } finally {
            setLoading(false);
        }
        */
    };

    useEffect(() => {
        checkLicense();
        // Optional: Poll every few minutes
    }, []);

    if (loading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    }

    if (isLocked) {
        return <ActivationScreen onActivated={() => checkLicense()} />;
    }

    return <>{children}</>;
}
