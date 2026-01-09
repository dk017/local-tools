import React from 'react';
import ActivationScreen from './ActivationScreen';
import { useLicense } from '../hooks/useLicense';

export default function ActivationWrapper({ children }: { children: React.ReactNode }) {
    const { valid, loading, status, validateLicense, activateLicense } = useLicense();

    // Show loading state only on initial load
    if (loading && status === 'checking') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Checking license...</p>
                </div>
            </div>
        );
    }

    // Show activation screen if license is invalid
    if (!valid) {
        return (
            <ActivationScreen 
                onActivated={() => validateLicense()} 
                onActivate={activateLicense}
            />
        );
    }

    // License is valid - show app
    return <>{children}</>;
}
