import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Smartphone,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle2,
  Sparkles,
  User,
  Bell,
  BookOpen,
  HelpCircle,
  FileText,
  X,
  HeartHandshake,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { PlumbLineLogo } from './PlumbLineLogo';
import { sendTestPushNotification } from '../utils/taskNotificationManager';

interface SettingsViewProps {
  currentTheme: 'system' | 'light' | 'dark';
  onSelectTheme: (theme: 'system' | 'light' | 'dark') => void;
  onClearAllData: () => void;
  onExportData: () => void;
  currentUser?: any;
  onOpenAuth?: () => void;
  onOpenNotifications?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTheme,
  onSelectTheme,
  onClearAllData,
  onExportData,
  currentUser,
  onOpenAuth,
  onOpenNotifications,
}) => {
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  return (
    <div
      id="settings-view"
      className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden"
    >
      {/* Header */}
      <div className="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <PlumbLineLogo size={18} color="var(--accent-gold)" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-main)]">
            Settings & Preferences
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-[var(--accent-gold-light)] text-[var(--accent-gold)] px-2 py-0.5 rounded-full font-medium">
            v1.0.0
          </span>
        </div>
      </div>

      {/* Settings Scrollable Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-xl mx-auto w-full">
        {/* App Identity Card */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-4 shadow-xs">
          <img
            src="/app-logo-adaptive.png"
            alt="Plumb Line Logo"
            className="w-16 h-16 rounded-2xl object-cover shadow-md border border-[var(--border-subtle)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-[var(--text-main)]">Rooted Guide</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
                Plumb Line
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Scripture Study & Botanical Care
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span>Offline-first on-device architecture</span>
            </p>
          </div>
        </div>

        {/* User Account / Firebase Auth */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold px-1">
            Account & Synchronization
          </span>
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-semibold text-sm">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-main)]">
                    {currentUser ? currentUser.displayName || currentUser.email : 'Guest Session (Private)'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {currentUser ? 'Cloud backup enabled via Firebase' : 'Data stored on this device • Sign in to backup'}
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
              >
                {currentUser ? 'Manage Account' : 'Sign In / Register'}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications & Reminders */}
        {onOpenNotifications && (
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold px-1">
              Alerts & Reminders
            </span>
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-main)]">Daily Notifications</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Plant watering reminders, devotions & new reflections
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setTestPushStatus('Sending test...');
                      const res = await sendTestPushNotification();
                      setTestPushStatus(res.success ? 'Delivered!' : 'Sent in-app');
                      setTimeout(() => setTestPushStatus(null), 3000);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Send a live test push notification to verify"
                  >
                    <span>{testPushStatus || 'Test Push'}</span>
                  </button>
                  <button
                    onClick={onOpenNotifications}
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-main)] text-xs font-medium hover:bg-[var(--accent-gold-light)] hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Configure</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Offline Scripture Engine */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold px-1">
            Offline Scripture Engine
          </span>
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-amber-500" />
                <div>
                  <p className="font-semibold text-[var(--text-main)]">World English Bible (Canonical)</p>
                  <p className="text-[10px] text-[var(--text-muted)]">66 Books • 31,098 Verses Pre-loaded</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle2 size={11} /> On-Device Ready
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Full offline access is built in. Search, reading, daily path, and personal reflections function without an active internet connection.
            </p>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold px-1">
            Appearance
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'light', label: 'Warm Light', icon: Sun },
                { id: 'dark', label: 'Midnight Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Smartphone },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const isSelected = currentTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectTheme(opt.id)}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--accent-gold)] bg-[var(--bg-surface)] shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-muted)] hover:border-[var(--accent-gold)]/50'
                  }`}
                >
                  <Icon
                    size={16}
                    className={isSelected ? 'text-[var(--accent-gold)]' : 'text-[var(--text-tertiary)]'}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? 'text-[var(--text-main)] font-semibold' : ''
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Private Data Management Section */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold px-1">
            Data Privacy & Export
          </span>
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--text-main)]">Export Your Journal</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Download reflections, prayers, and bookmarks in JSON format.
                </p>
              </div>
              <button
                onClick={onExportData}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-main)] text-xs font-medium hover:bg-[var(--accent-gold-light)] hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Reset Local Data
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Clear local entries, reading history, and highlights.
                </p>
              </div>
              <button
                onClick={onClearAllData}
                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* App Store Compliance: Privacy, Terms & Crisis Support */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold px-1">
            Legal & Support
          </span>
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveLegalModal('privacy')}
                className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] hover:bg-[var(--border-subtle)] flex items-center justify-center gap-1.5 text-xs text-[var(--text-main)] font-medium transition-colors cursor-pointer"
              >
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Privacy Policy</span>
              </button>
              <button
                onClick={() => setActiveLegalModal('terms')}
                className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] hover:bg-[var(--border-subtle)] flex items-center justify-center gap-1.5 text-xs text-[var(--text-main)] font-medium transition-colors cursor-pointer"
              >
                <FileText size={14} className="text-amber-500" />
                <span>Terms of Service</span>
              </button>
            </div>

            {/* Crisis Support Lifeline */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <HeartHandshake size={15} className="text-rose-500" />
                <div>
                  <p className="font-semibold text-[var(--text-main)]">988 Crisis Lifeline</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Free, confidential 24/7 mental health support</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-semibold">
                Available 24/7
              </span>
            </div>

            {/* Support Email */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-[var(--accent-gold)]" />
                <div>
                  <p className="font-semibold text-[var(--text-main)]">Support Contact</p>
                  <p className="text-[10px] text-[var(--text-muted)]">matty@purepulse.one</p>
                </div>
              </div>
              <a
                href="mailto:matty@purepulse.one"
                className="text-[11px] text-[var(--accent-gold)] hover:underline font-medium"
              >
                Get Help
              </a>
            </div>
          </div>
        </div>

        {/* The Plumb Line Vision & Scripture */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-gold)]">
            <PlumbLineLogo size={14} color="var(--accent-gold)" />
            <span>The Plumb Line Vision</span>
          </div>
          <p className="font-scripture italic text-xs leading-relaxed text-[var(--text-muted)]">
            "He showed me this: behold, the Lord stood on a wall made by a plumb line, with a plumb
            line in his hand. The LORD said to me, 'Amos, what do you see?' I said, 'A plumb line.'
            Then the Lord said, 'Behold, I will set a plumb line in the middle of my people Israel.'"
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] pt-1">
            — Amos 7:7-8 (World English Bible)
          </p>
        </div>

        {/* Bible Translation Provenance */}
        <div className="text-center text-[11px] text-[var(--text-tertiary)] space-y-1 pb-8">
          <p>Plumb Line (Rooted Guide) • Version 1.0.0</p>
          <p>Translation: World English Bible (engwebp) • Public Domain</p>
          <p>Private on-device storage • Pure, Simple & Contemplative</p>
        </div>
      </div>

      {/* App Store Compliance: Privacy Policy & Terms Modal */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
              <div className="flex items-center gap-2">
                {activeLegalModal === 'privacy' ? (
                  <ShieldCheck size={18} className="text-emerald-500" />
                ) : (
                  <FileText size={18} className="text-amber-500" />
                )}
                <h3 className="font-semibold text-sm">
                  {activeLegalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h3>
              </div>
              <button
                onClick={() => setActiveLegalModal(null)}
                className="p-1.5 rounded-full hover:bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-4 text-xs text-[var(--text-muted)] space-y-3 leading-relaxed">
              {activeLegalModal === 'privacy' ? (
                <>
                  <p className="font-semibold text-[var(--text-main)]">1. On-Device, Offline-First Architecture</p>
                  <p>
                    Rooted Guide (Plumb Line) respects your privacy. By default, your journal reflections, notes, reading progress, and botanical plant care logs are stored directly on your device. We do not track, profile, or sell your personal information.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">2. Optional Cloud Synchronization</p>
                  <p>
                    If you choose to create an account via Firebase Authentication (email, Google, or Apple), your account credentials and encrypted data backups are synchronized securely using Google Cloud infrastructure. You maintain full ownership of your data.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">3. Account & Data Deletion</p>
                  <p>
                    In accordance with Apple App Store Review Guideline 5.1.1(v), you can permanently delete your account and all associated cloud data at any time from the Account screen, or clear your local device storage with one tap.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">4. Third-Party Services</p>
                  <p>
                    All AI interactions are processed through secured server-side proxies without exposing client secrets or device identifiers. No third-party ad networks or user tracking trackers are used.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">5. Contact</p>
                  <p>For privacy inquiries, contact the developer at: matty@purepulse.one</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[var(--text-main)]">1. Purpose & Faith Journey</p>
                  <p>
                    Rooted Guide (Plumb Line) provides personal scripture study, devotional reflections, and botanical care tracking. It is intended for spiritual growth, personal wellness, and quiet reflection.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">2. Non-Clinical Spiritual Companion</p>
                  <p>
                    The reflections, guide conversations, and plans provided within Rooted Guide are for spiritual enrichment only and do not constitute clinical medical, psychiatric, or pastoral advice.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">3. Emergency & Crisis Lifeline Notice</p>
                  <p>
                    If you or someone you know is experiencing acute distress, thoughts of self-harm, or an emergency, please dial or text 988 (in the United States and Canada) or contact your local emergency services immediately.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">4. Scripture Attribution</p>
                  <p>
                    Scripture quotations are taken from the World English Bible (WEB), which is dedicated to the public domain.
                  </p>
                  <p className="font-semibold text-[var(--text-main)]">5. Modifications</p>
                  <p>
                    These terms may be updated periodically. Continued use of the application indicates acceptance of any updated terms.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end shrink-0">
              <button
                onClick={() => setActiveLegalModal(null)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
