import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAStateSnapshot {
  isOnline: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isIOS: boolean;
  isInIframe: boolean;
  isOfflineReady: boolean;
}

const listeners = new Set<() => void>();

const checkStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

const checkInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const state: PWAStateSnapshot = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  deferredPrompt: null,
  isInstalled: checkStandalone(),
  isIOS:
    typeof window !== 'undefined'
      ? /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
      : false,
  isInIframe: checkInIframe(),
  isOfflineReady: false,
};

let initialized = false;

const notify = () => {
  listeners.forEach((fn) => fn());
};

const initGlobalListeners = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('online', () => {
    state.isOnline = true;
    notify();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    notify();
  });

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    state.deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    state.isInstalled = true;
    state.deferredPrompt = null;
    notify();
  });

  window.addEventListener('rapor-pwa-offline-ready', () => {
    state.isOfflineReady = true;
    notify();
  });

  window.addEventListener('rapor-pwa-sw-registered', () => {
    state.isOfflineReady = true;
    notify();
  });

  if (window.location.protocol !== 'file:' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && (reg.active || reg.installing || reg.waiting)) {
        state.isOfflineReady = true;
        notify();
      }
    }).catch(() => {});
  }

  const displayMedia = window.matchMedia('(display-mode: standalone)');
  const handleDisplayChange = (e: MediaQueryListEvent) => {
    state.isInstalled = e.matches;
    notify();
  };
  if (displayMedia.addEventListener) {
    displayMedia.addEventListener('change', handleDisplayChange);
  }
};

initGlobalListeners();

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(state.isOnline);

  useEffect(() => {
    initGlobalListeners();
    const sync = () => setIsOnline(state.isOnline);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [, setTick] = useState(0);

  useEffect(() => {
    initGlobalListeners();
    const sync = () => setTick((t) => t + 1);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!state.deferredPrompt) {
      return false;
    }
    try {
      await state.deferredPrompt.prompt();
      const choice = await state.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        state.isInstalled = true;
        state.deferredPrompt = null;
        notify();
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  return {
    isInstallable: !!state.deferredPrompt,
    isInstalled: state.isInstalled,
    isIOS: state.isIOS,
    isInIframe: state.isInIframe,
    isOfflineReady: state.isOfflineReady,
    deferredPrompt: state.deferredPrompt,
    install,
  };
}

export function usePWA() {
  const isOnline = useOnlineStatus();
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isInIframe,
    isOfflineReady,
    deferredPrompt,
    install,
  } = usePWAInstall();

  return {
    isOnline,
    isInstallable,
    isInstalled,
    isIOS,
    isInIframe,
    isOfflineReady,
    triggerInstall: install,
    install,
    deferredPrompt,
  };
}
