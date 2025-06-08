const GEOLOCATION_ENABLED_KEY = 'geolocation_enabled';
const MAP_PROVIDER_KEY = 'map_provider';

type MapProvider = 'google' | 'apple' | 'waze';

export function isGeolocationEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(GEOLOCATION_ENABLED_KEY);
  return saved === null ? true : saved === 'true';
}

export function setGeolocationEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GEOLOCATION_ENABLED_KEY, String(enabled));
}

export function getMapProvider(): MapProvider {
  if (typeof window === 'undefined') return 'google';
  const saved = localStorage.getItem(MAP_PROVIDER_KEY);
  return (saved as MapProvider) || 'google';
}

export function setMapProvider(provider: MapProvider): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MAP_PROVIDER_KEY, provider);
}
