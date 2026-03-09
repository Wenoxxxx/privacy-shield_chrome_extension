export const STORAGE_KEYS = {
  TRACKERS: 'trackers',
  HTTPS: 'https',
  FINGERPRINT: 'fingerprint',
  WEBRTC: 'webrtc',
  GEOLOCATION: 'geolocation',
  PRIVACY_LOGS: 'privacyLogs'
};

export const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.TRACKERS]: true,
  [STORAGE_KEYS.HTTPS]: true,
  [STORAGE_KEYS.FINGERPRINT]: true,
  [STORAGE_KEYS.WEBRTC]: true,
  [STORAGE_KEYS.GEOLOCATION]: true
};

export const MESSAGE_ACTIONS = {
  LOG_ACTIVITY: 'logActivity',
  ENABLE_GEOLOCATION: 'enableGeolocation',
  DISABLE_GEOLOCATION: 'disableGeolocation'
};

export const LOG_TYPES = {
  TRACKER: 'Tracker',
  FINGERPRINT: 'Fingerprint',
  HTTPS: 'HTTPS',
  GEOLOCATION: 'Geolocation'
};

export const SPOOF_COORDS = {
  LATITUDE: 37.7749,
  LONGITUDE: -122.4194,
  ACCURACY: 10
};
