import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  isDismissed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'manual_ios' | 'unavailable'>;
  dismiss: () => void;
  resetDismiss: () => void;
}

const STORAGE_KEY = 'softbarber_pwa_prompt_dismissed';

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if running as installed standalone PWA
    const checkStandalone = () => {
      const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
      const isStandaloneMedia = hasMatchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = typeof window !== 'undefined' && (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
      const isAndroidReferrer = typeof document !== 'undefined' && Boolean(document.referrer?.includes('android-app://'));

      const isStandaloneMode = Boolean(isStandaloneMedia || isIOSStandalone || isAndroidReferrer);
      setIsStandalone(isStandaloneMode);
    };

    // Check iOS device (iPhone, iPad, iPod)
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isAppleMobile);
    };

    // Check if user previously dismissed banner
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsDismissed(dismissed);

    checkStandalone();
    checkIOS();

    // Listen to Android / Chrome / Edge install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      localStorage.removeItem(STORAGE_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual_ios' | 'unavailable'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsStandalone(true);
        }
        return choice.outcome;
      } catch {
        return 'unavailable';
      }
    }

    if (isIOS && !isStandalone) {
      return 'manual_ios';
    }

    return 'unavailable';
  }, [deferredPrompt, isIOS, isStandalone]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const resetDismiss = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Can be installed if not already standalone and either has prompt or is iOS Safari
  const isInstallable = !isStandalone && (Boolean(deferredPrompt) || isIOS);

  return {
    isInstallable,
    isIOS,
    isStandalone,
    isDismissed,
    promptInstall,
    dismiss,
    resetDismiss,
  };
}

export default usePWAInstall;
