import React, { useState } from 'react';
import { Smartphone, Download, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { haptics } from '../utils/haptics';

interface AndroidInstallBannerProps {}

export const AndroidInstallBanner: React.FC<AndroidInstallBannerProps> = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('rooted_android_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // If already installed or dismissed in this session, do not show
  if (isInstalled || dismissed || !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    haptics.selection();
    await install();
  };

  const handleDismiss = () => {
    haptics.tap();
    setDismissed(true);
    try {
      sessionStorage.setItem('rooted_android_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div
      id="android-install-banner"
      className="w-full bg-gradient-to-r from-emerald-900/30 via-emerald-800/20 to-transparent border-b border-emerald-500/20 px-3 py-1.5 flex items-center justify-between text-xs select-none"
    >
      <div
        onClick={handleInstallClick}
        className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity flex-1 min-w-0"
      >
        <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Smartphone size={12} />
        </div>
        <div className="truncate">
          <span className="font-semibold text-emerald-400 text-[11px] mr-1.5">
            Install Application
          </span>
          <span className="text-[10px] text-[var(--text-muted)] hidden xs:inline">
            Install on your home screen for full offline study
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
        >
          <Download size={10} />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
