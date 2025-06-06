const GEOLOCATION_ENABLED_KEY = 'geolocation_enabled';

export function isGeolocationEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(GEOLOCATION_ENABLED_KEY);
  return saved === null ? true : saved === 'true';
}

export function setGeolocationEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GEOLOCATION_ENABLED_KEY, String(enabled));
}
