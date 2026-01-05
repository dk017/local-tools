/**
 * License Cache Utilities
 * 
 * Manages local storage caching of license status for fast app startup.
 * Cache is validated periodically and allows offline grace period.
 */

const CACHE_KEY = 'offline_tools_license_cache';
const CACHE_VALIDITY_HOURS = 24; // Cache is valid for 24 hours
const GRACE_PERIOD_DAYS = 7; // Allow 7 days offline access

export interface LicenseCache {
  valid: boolean;
  expiresAt: string;
  subscriptionId?: string;
  lastChecked: number; // timestamp
  status: 'active' | 'grace_period' | 'expired' | 'invalid';
  data?: any; // Full license data from backend
}

/**
 * Get cached license status
 */
export function getCachedLicense(): LicenseCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const license: LicenseCache = JSON.parse(cached);
    
    // Check if cache is still valid (within validity period)
    const now = Date.now();
    const cacheAge = now - license.lastChecked;
    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
    
    if (cacheAgeHours > CACHE_VALIDITY_HOURS) {
      // Cache expired, but check if we're in grace period
      if (license.valid && license.expiresAt) {
        const expiresAt = new Date(license.expiresAt).getTime();
        const gracePeriodEnd = expiresAt + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        
        if (now <= gracePeriodEnd) {
          // Still in grace period, return cached but mark for revalidation
          return {
            ...license,
            status: 'grace_period',
            lastChecked: now, // Update to trigger background check
          };
        }
      }
      
      // Cache expired and beyond grace period
      return null;
    }
    
    return license;
  } catch (error) {
    console.error('Error reading license cache:', error);
    return null;
  }
}

/**
 * Save license status to cache
 */
export function setCachedLicense(licenseData: {
  valid: boolean;
  expiresAt?: string;
  subscriptionId?: string;
  status: 'active' | 'grace_period' | 'expired' | 'invalid';
  data?: any;
}): void {
  try {
    const cache: LicenseCache = {
      valid: licenseData.valid,
      expiresAt: licenseData.expiresAt || '',
      subscriptionId: licenseData.subscriptionId,
      lastChecked: Date.now(),
      status: licenseData.status,
      data: licenseData.data,
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving license cache:', error);
  }
}

/**
 * Clear license cache
 */
export function clearLicenseCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing license cache:', error);
  }
}

/**
 * Check if cache needs background validation
 */
export function needsBackgroundValidation(cache: LicenseCache | null): boolean {
  if (!cache) return true;
  
  const now = Date.now();
  const cacheAge = now - cache.lastChecked;
  const cacheAgeHours = cacheAge / (1000 * 60 * 60);
  
  // Revalidate if cache is older than 12 hours
  return cacheAgeHours > 12;
}

