import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Download,
  Terminal,
  FileCode,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PlumbLineLogo } from './PlumbLineLogo';
import { haptics } from '../utils/haptics';

interface AndroidPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStandalone: boolean;
  onTriggerInstall?: () => void;
  isInstallable?: boolean;
}

export const AndroidPackageModal: React.FC<AndroidPackageModalProps> = ({
  isOpen,
  onClose,
  isStandalone,
  onTriggerInstall,
  isInstallable,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    haptics.tap();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const bubblewrapCommand = `npm install -g @bubblewrap/cli\nbubblewrap init --manifest=${window.location.origin}/manifest.json\nbubblewrap build`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-main)]">
                Native Android (AAB & APK) Center
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Google Play Store Bundle & Direct Package Architecture
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed">
          {/* Runtime State Banner */}
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-main)] text-xs">
                  {isStandalone ? 'Running as Native Android App' : 'Ready for Android AAB / APK Installation'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {isStandalone
                    ? 'Full standalone edge-to-edge window active'
                    : 'Install directly to your Android device or build release binaries'}
                </p>
              </div>
            </div>
            {isInstallable && !isStandalone && onTriggerInstall && (
              <button
                onClick={() => {
                  haptics.selection();
                  onTriggerInstall();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shrink-0 transition-colors shadow-xs cursor-pointer"
              >
                Install APK
              </button>
            )}
          </div>

          {/* Android Specification Matrix */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] px-1">
              Android Package Specifications
            </span>
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[var(--bg-muted)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] block">Package ID</span>
                  <span className="font-mono font-semibold text-[var(--text-main)] text-[11px] truncate block">
                    com.mattjhagen.plumbline
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-muted)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] block">Version & Code</span>
                  <span className="font-mono font-semibold text-[var(--text-main)] text-[11px] block">
                    v1.0.0 (Code 100)
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-muted)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] block">Android Target SDK</span>
                  <span className="font-semibold text-[var(--text-main)] text-[11px] block">
                    API 35 (Android 15)
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-muted)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] block">Min Android SDK</span>
                  <span className="font-semibold text-[var(--text-main)] text-[11px] block">
                    API 24 (Android 7.0+)
                  </span>
                </div>
              </div>

              {/* Feature capabilities */}
              <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Adaptive Icon & Monochrome</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Launcher App Shortcuts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Android Back Gesture Hook</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Material 3 Tactile Haptics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Offline SQLite Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Digital Asset Links Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Direct AAB / APK Build Terminal Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                Compile to Release .AAB & .APK
              </span>
              <button
                onClick={() => copyToClipboard(bubblewrapCommand, 'build-cmd')}
                className="flex items-center gap-1 text-[10px] text-[var(--accent-gold)] hover:underline cursor-pointer"
              >
                {copiedKey === 'build-cmd' ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedKey === 'build-cmd' ? 'Copied!' : 'Copy CLI Command'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black text-emerald-400 font-mono text-[11px] leading-relaxed relative border border-emerald-950 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 pb-1.5 border-b border-zinc-800 mb-2">
                <Terminal size={12} />
                <span>Google Bubblewrap CLI (Official Android Build Pipeline)</span>
              </div>
              <p className="text-zinc-400"># 1. Install Google CLI & Initialize TWA</p>
              <p>npm install -g @bubblewrap/cli</p>
              <p>bubblewrap init --manifest={window.location.origin}/manifest.json</p>
              <p className="text-zinc-400 mt-2"># 2. Build signed production .aab and .apk</p>
              <p className="text-amber-300">bubblewrap build</p>
              <p className="text-zinc-500 text-[10px] mt-2">
                &gt; Outputs: app-release-bundle.aab (Play Store) &amp; app-release-signed.apk (Direct install)
              </p>
            </div>
          </div>

          {/* Digital Asset Links */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px] text-[var(--text-main)] flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Digital Asset Links (/ .well-known / assetlinks.json)</span>
              </span>
              <a
                href="/.well-known/assetlinks.json"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[var(--accent-gold)] flex items-center gap-0.5 hover:underline"
              >
                <span>View JSON</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Automatically verifies domain association with package <code className="text-[var(--text-main)]">com.mattjhagen.plumbline</code> to eliminate the browser URL bar in TWA and APK mode.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <a
            href="/twa-manifest.json"
            download="twa-manifest.json"
            className="flex items-center gap-1.5 text-xs text-[var(--accent-gold)] hover:underline font-medium"
          >
            <Download size={13} />
            <span>Download twa-manifest.json</span>
          </a>

          <button
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-semibold text-xs transition-opacity hover:opacity-90 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
