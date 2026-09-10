import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
  LogOut,
  KeyRound,
  ShieldCheck,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  appleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  doc,
  deleteDoc,
  FirebaseUser,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [appleNeedsSetup, setAppleNeedsSetup] = useState(false);
  const [showSetupSteps, setShowSetupSteps] = useState(false);

  // Check for redirect result (e.g. returning from Apple or Google redirect authentication)
  React.useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setSuccessMessage('Signed in successfully!');
          setTimeout(() => onClose(), 1200);
        }
      })
      .catch((err) => {
        if (err?.code && err.code !== 'auth/null-user') {
          console.warn('Redirect auth result error:', err);
          setError(err.message || 'Authentication could not be completed.');
        }
      });
  }, [onClose]);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!email.trim() || !password) throw new Error('Please enter both email and password');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        setSuccessMessage('Account created successfully! Welcome to Rooted Guide.');
        setTimeout(() => onClose(), 1500);
      } else if (mode === 'login') {
        if (!email.trim() || !password) throw new Error('Please enter both email and password');
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setSuccessMessage('Signed in successfully.');
        setTimeout(() => onClose(), 1200);
      } else if (mode === 'reset') {
        if (!email.trim()) throw new Error('Please enter your email address to receive reset instructions');
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMessage('Password reset email sent! Please check your inbox.');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User intentionally closed or dismissed the popup prompt; do not treat as error
        return;
      }
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email sign-in is temporarily unavailable. Please try again later.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please verify your credentials or click "Sign up" to create a new account.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please switch to "Log in".';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Sign-in is temporarily unavailable from this connection. Please try again shortly.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccessMessage('Signed in with Google!');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User voluntarily dismissed popup
        return;
      }
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or open the app in a dedicated tab.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Sign-in is temporarily unavailable from this connection.');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setAppleNeedsSetup(false);
    setLoading(true);
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    try {
      // In web/PWA: First attempt signInWithPopup
      const result = await signInWithPopup(auth, appleProvider);
      if (result?.user) {
        setSuccessMessage('Signed in with Apple!');
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User voluntarily dismissed Apple sign-in popup
        setLoading(false);
        return;
      }

      console.warn('Apple sign-in attempt error:', err);

      if (err?.code === 'auth/operation-not-allowed') {
        setAppleNeedsSetup(true);
        setError('Apple Sign-In is not enabled yet in your Firebase Console.');
        setLoading(false);
        return;
      }

      // In an iframe (e.g. AI Studio preview), Apple blocks embedded frames (X-Frame-Options: SAMEORIGIN)
      if (isInIframe) {
        if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/unauthorized-domain' || err?.code === 'auth/internal-error') {
          setError('Apple Sign-In requires a top-level window. Open the application in a dedicated window to sign in with your Apple ID.');
        } else {
          setError(err?.message || 'Apple Sign-In could not be opened in the embedded preview.');
        }
        setLoading(false);
        return;
      }

      // Outside iframe (mobile Safari/Chrome, installed PWA, standalone Android/iOS):
      // Fallback automatically to standard Firebase signInWithRedirect
      try {
        await signInWithRedirect(auth, appleProvider);
        return;
      } catch (redirectErr: any) {
        console.error('Apple redirect error:', redirectErr);
        if (redirectErr?.code === 'auth/operation-not-allowed') {
          setAppleNeedsSetup(true);
          setError('Apple Sign-In is not enabled yet in your Firebase Console.');
        } else {
          setError(redirectErr?.message || 'Unable to connect to Apple ID. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSuccessMessage('You have been signed out.');
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Delete user's Firestore document
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
      } catch (docErr) {
        console.warn('User document cleanup non-blocking:', docErr);
      }

      // 2. Clear local storage records
      localStorage.removeItem('plumbline_bookmarks');
      localStorage.removeItem('plumbline_highlights');
      localStorage.removeItem('plumbline_notes');
      localStorage.removeItem('plumbline_guide_turns');
      localStorage.removeItem('rooted_plants_cache');

      // 3. Delete Firebase Auth account
      await deleteUser(currentUser);
      setSuccessMessage('Account and all personal records permanently deleted.');
      setConfirmDelete(false);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setError('For security, please sign out and sign back in immediately before deleting your account.');
      } else {
        setError(err.message || 'Failed to delete account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[var(--border-subtle)] relative"
        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors text-[var(--text-muted)] cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* User is already signed in */}
        {currentUser ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={30} />
              )}
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-main)]">
              {currentUser.displayName || currentUser.email?.split('@')[0] || 'Rooted Pilgrim'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">{currentUser.email}</p>

            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-left text-xs mb-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Cloud Backup:</span>
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <ShieldCheck size={13} /> Active & Synced
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Auth Provider:</span>
                <span className="capitalize">{currentUser.providerData[0]?.providerId.replace('.com', '') || 'Email'}</span>
              </div>
            </div>

            {/* Error or Success Alert */}
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2 text-left">
                <CheckCircle size={15} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] text-[var(--text-main)] font-medium text-xs tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={loading}
                  className="w-full py-2 px-4 rounded-xl text-rose-500 hover:bg-rose-500/10 font-medium text-[11px] tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100"
                >
                  <Trash2 size={13} />
                  <span>Delete Account & Personal Data</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-left space-y-2">
                  <p className="text-[11px] text-rose-400 font-medium leading-relaxed">
                    Permanently delete your account and wipe all synced personal records from cloud storage? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer text-center"
                    >
                      {loading ? 'Deleting...' : 'Confirm Deletion'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={loading}
                      className="py-1.5 px-3 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/app-logo-adaptive.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                <span className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                  ROOTED GUIDE
                </span>
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'reset' && 'Reset Password'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {mode === 'login' && 'Sync your scripture highlights, plants, and reflections across devices'}
                {mode === 'signup' && 'Secure cloud backup for your reflections, prayers, and study'}
                {mode === 'reset' && 'Enter your email to receive a password recovery link'}
              </p>
            </div>

            {/* Error or Success Alert */}
            {appleNeedsSetup ? (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left space-y-2.5">
                <div className="flex items-start gap-2 text-amber-400">
                  <AlertCircle size={17} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-300">
                      Apple Provider Setup Required
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      To enable Apple Sign-In, Apple must be toggled on under Sign-in Providers in your Firebase project (<code className="text-amber-200">plumb-line-508101</code>).
                    </p>
                  </div>
                </div>

                <a
                  href="https://console.firebase.google.com/project/plumb-line-508101/authentication/providers"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Open Firebase Console Providers</span>
                  <ExternalLink size={13} />
                </a>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSetupSteps(!showSetupSteps)}
                    className="w-full py-1 text-[11px] text-amber-300/80 hover:text-amber-300 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{showSetupSteps ? 'Hide setup steps' : 'View Apple Developer setup steps'}</span>
                    {showSetupSteps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showSetupSteps && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1.5 font-normal">
                      <p className="font-semibold text-[var(--text-main)]">How to enable in Firebase:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-[10.5px] leading-relaxed">
                        <li>In Firebase Console, click <span className="text-[var(--text-main)] font-medium">Add new provider</span> &rarr; select <span className="text-[var(--text-main)] font-medium">Apple</span>.</li>
                        <li>Toggle <span className="text-[var(--text-main)] font-medium">Enable</span>.</li>
                        <li>Enter your Apple Services ID (e.g. <code>com.mattjhagen.plumbline</code>).</li>
                        <li>Enter your Apple Team ID, Key ID, and upload your private key (<code>.p8</code>) from developer.apple.com.</li>
                        <li>Click <span className="text-[var(--text-main)] font-medium">Save</span>.</li>
                      </ol>
                    </div>
                  )}
                </div>

                <div className="pt-1.5 border-t border-amber-500/20 flex items-center justify-between">
                  <span className="text-[10.5px] text-[var(--text-muted)]">Available immediately:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppleNeedsSetup(false);
                      setError(null);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                  >
                    Use Google or Email &rarr;
                  </button>
                </div>
              </div>
            ) : error ? (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex flex-col gap-2 text-left">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {error.includes('top-level') && (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(window.location.origin + '?openAuth=apple', '_blank');
                    }}
                    className="w-full mt-1 py-2 px-3 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink size={13} />
                    <span>Open Dedicated Window for Apple Sign-In</span>
                  </button>
                )}
              </div>
            ) : null}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Social Sign-In Buttons */}
            {mode !== 'reset' && (
              <div className="space-y-2 mb-5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12.01-14.42-7.29-11.14-13.06-23.77-17.3-37.89-4.24-14.12-6.36-26.7-6.36-37.74 0-16.7 4.12-30.43 12.37-41.17 8.24-10.74 18.66-16.27 31.25-16.59 5.09 0 10.75 1.41 16.98 4.23 6.23 2.82 10.15 4.34 11.76 4.58 2.01-.36 6.18-2 12.52-4.94 6.33-2.94 11.95-4.29 16.85-4.06 14.88.94 26.6 6.3 35.16 16.09-13.17 7.99-19.64 18.91-19.4 32.77.24 10.7 4.3 19.6 12.18 26.7 7.87 7.09 17.29 11.14 28.25 12.15-2.47 7.64-5.59 15.35-9.37 23.14zM119.22 33.15c0-7.3 2.66-14.28 7.99-20.93 5.33-6.65 11.96-10.98 19.89-13-1.06 7.42-3.9 14.36-8.52 20.82-4.63 6.46-10.42 10.82-17.37 13.08-.6-0.03-1.26-.06-1.99.03z" />
                  </svg>
                  <span>Continue with Apple</span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border-subtle)]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-[var(--bg-main)] px-2 text-[var(--text-tertiary)]">
                      Or with email
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-[var(--text-muted)]">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setError(null);
                        }}
                        className="text-[10px] text-amber-500 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-medium text-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Free Account'}
                    {mode === 'reset' && 'Send Reset Email'}
                  </span>
                )}
              </button>
            </form>

            {/* Mode Switchers */}
            <div className="text-center mt-4 text-xs text-[var(--text-muted)]">
              {mode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="text-amber-500 font-medium hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-amber-500 font-medium hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
