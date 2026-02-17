// PostHog Analytics Helpers
// Replace YOUR_POSTHOG_KEY with your actual PostHog project API key

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.identify(userId, traits);
  }
}
