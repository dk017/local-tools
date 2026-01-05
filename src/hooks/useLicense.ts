import { useState, useEffect, useCallback } from 'react';
import { usePython } from './usePython';
import {
  getCachedLicense,
  setCachedLicense,
  clearLicenseCache,
  needsBackgroundValidation,
  LicenseCache,
} from '../utils/licenseCache';

interface LicenseStatus {
  valid: boolean;
  loading: boolean;
  status: 'active' | 'grace_period' | 'expired' | 'invalid' | 'checking';
  error?: string;
  data?: any;
}

/**
 * Custom hook for license management with caching
 * 
 * Features:
 * - Fast startup using cached status
 * - Background validation
 * - Grace period for offline access
 * - Automatic periodic checks
 */
export function useLicense() {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>({
    valid: false,
    loading: true,
    status: 'checking',
  });
  
  const { execute } = usePython();

  /**
   * Check license from backend (Python sidecar)
   */
  const checkBackendLicense = useCallback(async (): Promise<LicenseCache | null> => {
    try {
      // Allow bypass in development
      if (import.meta.env.DEV && import.meta.env.VITE_SKIP_LICENSE === 'true') {
        return {
          valid: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          lastChecked: Date.now(),
          status: 'active',
        };
      }

      const data = await execute('licensing', 'status', {});
      
      if (data && data.valid) {
        const cache: LicenseCache = {
          valid: true,
          expiresAt: data.expires_at || data.data?.expires_at || '',
          subscriptionId: data.subscription_id || data.data?.subscription_id,
          lastChecked: Date.now(),
          status: data.in_grace_period ? 'grace_period' : 'active',
          data: data.data || data,
        };
        
        // Save to cache
        setCachedLicense(cache);
        return cache;
      } else {
        // Invalid license
        const cache: LicenseCache = {
          valid: false,
          expiresAt: '',
          lastChecked: Date.now(),
          status: data?.status === 'expired' ? 'expired' : 'invalid',
          data: data,
        };
        
        setCachedLicense(cache);
        return cache;
      }
    } catch (error: any) {
      console.error('License check failed:', error);
      
      // On error, return null to trigger cache fallback
      return null;
    }
  }, [execute]);

  /**
   * Validate license (check with backend)
   */
  const validateLicense = useCallback(async (force = false): Promise<void> => {
    // Check cache first (unless forced)
    if (!force) {
      const cached = getCachedLicense();
      
      if (cached) {
        // Use cached status immediately
        setLicenseStatus({
          valid: cached.valid,
          loading: false,
          status: cached.status,
          data: cached.data,
        });
        
        // Check if background validation is needed
        if (needsBackgroundValidation(cached)) {
          // Validate in background (non-blocking)
          checkBackendLicense().then((result) => {
            if (result) {
              setLicenseStatus({
                valid: result.valid,
                loading: false,
                status: result.status,
                data: result.data,
              });
            }
          }).catch(() => {
            // Background validation failed, keep using cache
            console.warn('Background license validation failed, using cache');
          });
        }
        
        return;
      }
    }

    // No cache or forced validation - check backend
    setLicenseStatus(prev => ({ ...prev, loading: true, status: 'checking' }));
    
    const result = await checkBackendLicense();
    
    if (result) {
      setLicenseStatus({
        valid: result.valid,
        loading: false,
        status: result.status,
        data: result.data,
      });
    } else {
      // Backend check failed, try cache as fallback
      const cached = getCachedLicense();
      if (cached) {
        setLicenseStatus({
          valid: cached.valid,
          loading: false,
          status: cached.status,
          data: cached.data,
        });
      } else {
        setLicenseStatus({
          valid: false,
          loading: false,
          status: 'invalid',
          error: 'License check failed',
        });
      }
    }
  }, [checkBackendLicense]);

  /**
   * Activate license
   */
  const activateLicense = useCallback(async (licenseKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLicenseStatus(prev => ({ ...prev, loading: true }));
      
      const data = await execute('licensing', 'activate', {
        license_key: licenseKey.trim(),
      });

      if (data.success) {
        // Clear old cache and validate to get fresh status
        clearLicenseCache();
        await validateLicense(true);
        
        return { success: true };
      } else {
        setLicenseStatus(prev => ({ ...prev, loading: false }));
        return { success: false, error: data.error || 'Activation failed' };
      }
    } catch (error: any) {
      setLicenseStatus(prev => ({ ...prev, loading: false }));
      return { success: false, error: error.message || 'Connection error' };
    }
  }, [execute, validateLicense]);

  /**
   * Initialize license check on mount
   */
  useEffect(() => {
    validateLicense();
    
    // Set up periodic validation (every 24 hours)
    const interval = setInterval(() => {
      validateLicense(true);
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    return () => clearInterval(interval);
  }, [validateLicense]);

  return {
    ...licenseStatus,
    validateLicense: () => validateLicense(true),
    activateLicense,
    refresh: () => validateLicense(true),
  };
}

