import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { IOSInstallModal } from '../components/common/IOSInstallModal';
import { InstallAppBanner } from '../components/common/InstallAppBanner';
import { Header } from '../components/layout/Header';

describe('PWA & Mobile Install Features', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('usePWAInstall Hook', () => {
    it('initializes with default non-standalone state in standard browser', () => {
      const { result } = renderHook(() => usePWAInstall());
      expect(result.current.isStandalone).toBe(false);
      expect(result.current.isDismissed).toBe(false);
    });

    it('captures beforeinstallprompt event and sets isInstallable to true', () => {
      const { result } = renderHook(() => usePWAInstall());

      const mockPromptEvent = new Event('beforeinstallprompt') as any;
      mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
      mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

      act(() => {
        window.dispatchEvent(mockPromptEvent);
      });

      expect(result.current.isInstallable).toBe(true);
    });

    it('triggers promptInstall and handles accepted outcome', async () => {
      const { result } = renderHook(() => usePWAInstall());

      const mockPromptEvent = new Event('beforeinstallprompt') as any;
      mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
      mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

      act(() => {
        window.dispatchEvent(mockPromptEvent);
      });

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });

      expect(mockPromptEvent.prompt).toHaveBeenCalled();
      expect(outcome).toBe('accepted');
      expect(result.current.isStandalone).toBe(true);
    });

    it('persists dismissed state in localStorage when dismiss() is called', () => {
      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.isDismissed).toBe(true);
      expect(localStorage.getItem('softbarber_pwa_prompt_dismissed')).toBe('true');

      act(() => {
        result.current.resetDismiss();
      });

      expect(result.current.isDismissed).toBe(false);
      expect(localStorage.getItem('softbarber_pwa_prompt_dismissed')).toBeNull();
    });
  });

  describe('IOSInstallModal Component', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(<IOSInstallModal isOpen={false} onClose={vi.fn()} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders step-by-step instructions when isOpen is true', () => {
      const handleClose = vi.fn();
      render(<IOSInstallModal isOpen={true} onClose={handleClose} />);

      expect(screen.getByText(/instalar no iphone/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. toque em compartilhar/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. adicionar à tela de início/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. confirmar "adicionar"/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /entendi, vou instalar/i });
      fireEvent.click(confirmBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the close X button', () => {
      const handleClose = vi.fn();
      render(<IOSInstallModal isOpen={true} onClose={handleClose} />);

      const closeBtn = screen.getByRole('button', { name: /fechar instruções/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('InstallAppBanner Component', () => {
    it('renders banner when forceShow is true', () => {
      render(<InstallAppBanner forceShow={true} />);

      expect(screen.getByText(/instalar aplicativo softbarber/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /instalar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dispensar/i })).toBeInTheDocument();
    });

    it('triggers dismiss when close button is clicked', () => {
      render(<InstallAppBanner forceShow={true} />);

      const dismissBtn = screen.getByRole('button', { name: /dispensar/i });
      fireEvent.click(dismissBtn);
      expect(localStorage.getItem('softbarber_pwa_prompt_dismissed')).toBe('true');
    });
  });

  describe('Header Component PWA Integration', () => {
    it('renders Instalar App button in header when not in standalone mode', () => {
      render(
        <Header
          activeMode="client"
          onModeChange={vi.fn()}
        />
      );

      const installBtn = screen.getByRole('button', { name: /instalar app/i });
      expect(installBtn).toBeInTheDocument();
    });
  });
});
