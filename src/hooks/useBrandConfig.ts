import { usePlatformSettings, PlatformSettings } from './usePlatformSettings';

export interface BrandConfig {
  appName: string;
  tagline: string;
  supportEmail: string;
  privacyEmail: string;
  termsUrl: string;
  privacyUrl: string;
  dashboardUrl: string;
  isLoading: boolean;
}

const DEFAULT_BRAND: Omit<BrandConfig, 'isLoading'> = {
  appName: 'MediLead',
  tagline: 'Fill Healthcare Roles 3x Faster',
  supportEmail: 'support@medilead.io',
  privacyEmail: 'privacy@medilead.io',
  termsUrl: '/terms',
  privacyUrl: '/privacy',
  dashboardUrl: '',
};

export function useBrandConfig(): BrandConfig {
  const { data: settings, isLoading } = usePlatformSettings();

  if (isLoading || !settings) {
    return {
      ...DEFAULT_BRAND,
      isLoading,
    };
  }

  return {
    appName: settings.app_name || DEFAULT_BRAND.appName,
    tagline: settings.app_tagline || DEFAULT_BRAND.tagline,
    supportEmail: settings.support_email || DEFAULT_BRAND.supportEmail,
    privacyEmail: settings.privacy_email || DEFAULT_BRAND.privacyEmail,
    termsUrl: settings.terms_url || DEFAULT_BRAND.termsUrl,
    privacyUrl: settings.privacy_url || DEFAULT_BRAND.privacyUrl,
    dashboardUrl: settings.dashboard_url || DEFAULT_BRAND.dashboardUrl,
    isLoading: false,
  };
}