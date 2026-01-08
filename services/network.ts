export type NetworkStatus = { online: boolean };

/**
 * Lightweight network detection without plugins.
 * Works in Capacitor WebView and browsers.
 */
export const isOnline = (): boolean => {
  // navigator.onLine can be false positives on some OEMs, but is sufficient for basic offline gating
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export const onStatusChange = (cb: (status: NetworkStatus) => void): (() => void) => {
  const handleOnline = () => cb({ online: true });
  const handleOffline = () => cb({ online: false });
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  // Fire initial status
  cb({ online: isOnline() });
  // Unsubscribe
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
