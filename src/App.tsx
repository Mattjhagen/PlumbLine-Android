import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Calendar,
  BookOpen,
  Bookmark,
  Settings,
  Sparkles,
  Leaf,
  FileText,
  MessageSquare,
  Bell,
  User,
  ShieldCheck,
  CheckCircle,
  X,
  Smartphone,
} from 'lucide-react';
import { PlumbLineLogo } from './components/PlumbLineLogo';
import { LaunchScreen } from './components/LaunchScreen';
import { GuideView } from './components/GuideView';
import { DailyPathView } from './components/DailyPathView';
import { BibleReaderView } from './components/BibleReaderView';
import { SavedItemsView } from './components/SavedItemsView';
import { SettingsView } from './components/SettingsView';
import { DynamicPlanView } from './components/DynamicPlanView';
import { PlantCareView } from './components/PlantCareView';
import { ArticlesView } from './components/ArticlesView';
import { CommunityForumView } from './components/CommunityForumView';
import { AuthModal } from './components/AuthModal';
import { NotificationModal } from './components/NotificationModal';
import { AndroidInstallBanner } from './components/AndroidInstallBanner';
import { AndroidPackageModal } from './components/AndroidPackageModal';
import { haptics } from './utils/haptics';
import { usePWAInstall } from './utils/usePWAInstall';
import { useAndroidBackButton } from './utils/useAndroidBackButton';
import { getReconciledTasks } from './utils/taskNotificationManager';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  onAuthStateChanged,
  FirebaseUser,
} from './lib/firebase';
import {
  Bookmark as BookmarkType,
  Highlight,
  HighlightColor,
  UserNote,
} from './types';

type TabType =
  | 'path'
  | 'dynamic_plan'
  | 'plants'
  | 'articles'
  | 'community'
  | 'guide'
  | 'bible'
  | 'saved'
  | 'settings';

export default function App() {
  // Cold launch splash screen state
  const [showLaunch, setShowLaunch] = useState<boolean>(() => {
    try {
      const hasLaunchedThisSession = sessionStorage.getItem('plumbline_launched');
      return !hasLaunchedThisSession;
    } catch {
      return true;
    }
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('path');
  const [tabHistory, setTabHistory] = useState<TabType[]>(['path']);

  // Android Native state & PWA Install
  const [showAndroidCenter, setShowAndroidCenter] = useState<boolean>(false);
  const { isInstalled, isInstallable, install } = usePWAInstall();

  const handleSelectTab = useCallback((tab: TabType) => {
    haptics.selection();
    setTabHistory((prev) => [...prev.slice(-12), tab]);
    setActiveTab(tab);
  }, []);

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Notifications state
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [remindersCount, setRemindersCount] = useState<number>(0);

  // Android Back button management
  const activeModalName = showAuthModal
    ? 'auth'
    : showNotificationModal
    ? 'notifications'
    : showAndroidCenter
    ? 'android_center'
    : null;

  const handleCloseActiveModal = useCallback(() => {
    setShowAuthModal(false);
    setShowNotificationModal(false);
    setShowAndroidCenter(false);
  }, []);

  useAndroidBackButton({
    activeModal: activeModalName,
    onCloseModal: handleCloseActiveModal,
    canGoBackTab: tabHistory.length > 1,
    onGoBackTab: () => {
      setTabHistory((prev) => {
        if (prev.length <= 1) return prev;
        const updated = prev.slice(0, -1);
        const target = updated[updated.length - 1];
        setActiveTab(target);
        return updated;
      });
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // In-app notification toast listener
  const [inAppToast, setInAppToast] = useState<string | null>(null);
  useEffect(() => {
    const handleToast = (e: any) => {
      if (e.detail?.message) {
        setInAppToast(e.detail.message);
        setTimeout(() => setInAppToast(null), 4500);
      }
    };
    window.addEventListener('rooted_in_app_notification', handleToast);
    return () => window.removeEventListener('rooted_in_app_notification', handleToast);
  }, []);

  // Synchronize notification tasks & exact uncompleted count
  const syncTaskCount = useCallback(async () => {
    try {
      const { uncompletedCount } = await getReconciledTasks();
      setRemindersCount(uncompletedCount);
    } catch {
      // ignore offline
    }
  }, []);

  useEffect(() => {
    syncTaskCount();
    window.addEventListener('rooted_tasks_changed', syncTaskCount);
    const interval = setInterval(syncTaskCount, 25000);
    return () => {
      window.removeEventListener('rooted_tasks_changed', syncTaskCount);
      clearInterval(interval);
    };
  }, [syncTaskCount]);

  // Reader target book/chapter
  const [readerTarget, setReaderTarget] = useState<{
    book: string;
    chapter: number;
    verse?: number;
  }>(() => {
    try {
      const saved = localStorage.getItem('plumbline_last_read');
      return saved ? JSON.parse(saved) : { book: 'John', chapter: 3 };
    } catch {
      return { book: 'John', chapter: 3 };
    }
  });

  // Global Theme
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('plumbline_theme');
      return (saved as any) || 'system';
    } catch {
      return 'system';
    }
  });

  // User persistent data
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>(() => {
    try {
      const saved = localStorage.getItem('plumbline_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    try {
      const saved = localStorage.getItem('plumbline_highlights');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notes, setNotes] = useState<UserNote[]>(() => {
    try {
      const saved = localStorage.getItem('plumbline_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Synchronize theme to document element and Android status bar meta tag
  useEffect(() => {
    const root = document.documentElement;
    let isDark = false;
    if (theme === 'dark') {
      root.classList.add('dark');
      isDark = true;
    } else if (theme === 'light') {
      root.classList.remove('dark');
      isDark = false;
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        isDark = true;
      } else {
        root.classList.remove('dark');
        isDark = false;
      }
    }
    localStorage.setItem('plumbline_theme', theme);

    // Dynamic Android system navigation bar & status bar color tinting
    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0D0B09' : '#FAF8F4');
    }
  }, [theme]);

  // Android Launcher shortcuts & Share target deep link processor
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get('tab') as TabType;
      const validTabs: TabType[] = [
        'path',
        'dynamic_plan',
        'plants',
        'articles',
        'community',
        'guide',
        'bible',
        'saved',
        'settings',
      ];
      if (requestedTab && validTabs.includes(requestedTab)) {
        setActiveTab(requestedTab);
      }
      const sharedTitle = params.get('title') || params.get('text');
      if (sharedTitle) {
        setInAppToast(`Shared to Plumb Line: "${sharedTitle.slice(0, 45)}..."`);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('plumbline_bookmarks', JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem('plumbline_highlights', JSON.stringify(highlights));
    } catch {
      // ignore
    }
  }, [highlights]);

  useEffect(() => {
    try {
      localStorage.setItem('plumbline_notes', JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  // Bidirectional Cloud Synchronization with Firestore
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    async function fetchCloudData() {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists() && isMounted) {
          const cloudData = snap.data();
          if (Array.isArray(cloudData.bookmarks) && cloudData.bookmarks.length > 0) {
            setBookmarks((prev) => {
              const map = new Map<string, BookmarkType>();
              [...cloudData.bookmarks, ...prev].forEach((b) => {
                const key = `${b.book}-${b.chapter}-${b.verse}`;
                if (!map.has(key)) map.set(key, b);
              });
              return Array.from(map.values());
            });
          }
          if (Array.isArray(cloudData.highlights) && cloudData.highlights.length > 0) {
            setHighlights((prev) => {
              const map = new Map<string, Highlight>();
              [...cloudData.highlights, ...prev].forEach((h) => {
                const key = `${h.book}-${h.chapter}-${h.verse}`;
                if (!map.has(key)) map.set(key, h);
              });
              return Array.from(map.values());
            });
          }
          if (Array.isArray(cloudData.notes) && cloudData.notes.length > 0) {
            setNotes((prev) => {
              const map = new Map<string, UserNote>();
              [...cloudData.notes, ...prev].forEach((n) => {
                if (!map.has(n.id)) map.set(n.id, n);
              });
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync user data from cloud:', err);
      }
    }

    fetchCloudData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Push changes to Firestore when logged in (debounced)
  useEffect(() => {
    if (!currentUser) return;

    const timeout = setTimeout(async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(
          userDocRef,
          {
            email: currentUser.email,
            displayName: currentUser.displayName,
            bookmarks,
            highlights,
            notes,
            lastSyncedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Cloud sync push non-fatal:', err);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentUser, bookmarks, highlights, notes]);

  // Handlers for user modifications
  const handleToggleBookmark = (book: string, chapter: number, verse: number) => {
    setBookmarks((prev) => {
      const exists = prev.some(
        (b) => b.book === book && b.chapter === chapter && b.verse === verse
      );
      if (exists) {
        return prev.filter(
          (b) => !(b.book === book && b.chapter === chapter && b.verse === verse)
        );
      } else {
        const newBm: BookmarkType = {
          id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          book,
          chapter,
          verse,
          createdAt: new Date().toISOString(),
        };
        return [newBm, ...prev];
      }
    });
  };

  const handleToggleHighlight = (
    book: string,
    chapter: number,
    verse: number,
    color: HighlightColor
  ) => {
    setHighlights((prev) => {
      const filtered = prev.filter(
        (h) => !(h.book === book && h.chapter === chapter && h.verse === verse)
      );
      const newHl: Highlight = {
        id: `hl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        book,
        chapter,
        verse,
        color,
        createdAt: new Date().toISOString(),
      };
      return [newHl, ...filtered];
    });
  };

  const handleRemoveHighlight = (book: string, chapter: number, verse: number) => {
    setHighlights((prev) =>
      prev.filter((h) => !(h.book === book && h.chapter === chapter && h.verse === verse))
    );
  };

  const handleAddNote = (newNote: Omit<UserNote, 'id' | 'createdAt'>) => {
    const item: UserNote = {
      ...newNote,
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [item, ...prev]);
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleDeleteHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleOpenPassage = (book: string, chapter: number, verse?: number) => {
    setReaderTarget({ book, chapter, verse });
    setActiveTab('bible');
  };

  const handleAskGuide = (query: string) => {
    setActiveTab('guide');
    // Pre-fill input in GuideView by setting turns or local storage
    try {
      const current = localStorage.getItem('plumbline_guide_turns');
      const turns = current ? JSON.parse(current) : [];
      const newTurn = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: query,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('plumbline_guide_turns', JSON.stringify([...turns, newTurn]));
    } catch {
      // ignore
    }
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all your saved bookmarks, highlights, and notes?')) {
      setBookmarks([]);
      setHighlights([]);
      setNotes([]);
      localStorage.removeItem('plumbline_bookmarks');
      localStorage.removeItem('plumbline_highlights');
      localStorage.removeItem('plumbline_notes');
      localStorage.removeItem('plumbline_daily_session');
      localStorage.removeItem('plumbline_guide_turns');
    }
  };

  const handleExportData = () => {
    const exportObject = {
      app: 'Plumb Line (Rooted Guide)',
      exportDate: new Date().toISOString(),
      bookmarks,
      highlights,
      notes,
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plumbline-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDismissLaunch = () => {
    try {
      sessionStorage.setItem('plumbline_launched', 'true');
    } catch {
      // ignore
    }
    setShowLaunch(false);
  };

  // Render Inner Application Screens
  const renderAppContent = () => {
    if (showLaunch) {
      return <LaunchScreen onContinue={handleDismissLaunch} />;
    }

    return (
      <div className="flex flex-col h-full w-full bg-[var(--bg-main)] overflow-hidden">
        {/* Top iOS Header Bar */}
        <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 flex items-center justify-between shrink-0 z-20 select-none shadow-xs">
          <div
            onClick={() => setActiveTab('path')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src="/app-logo-adaptive.png"
              alt="Rooted Guide"
              className="w-7 h-7 rounded-lg object-cover shadow-xs border border-[var(--border-subtle)]"
            />
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-main)] block leading-none">
                Rooted Guide
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-widest leading-tight">
                Plumb Line
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Android AAB & APK Center */}
            <button
              onClick={() => {
                haptics.tap();
                setShowAndroidCenter(true);
              }}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--bg-muted)] relative transition-colors cursor-pointer"
              title="Native Android (AAB & APK) Center"
            >
              <Smartphone size={17} />
              {isInstallable && !isInstalled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => {
                haptics.tap();
                setShowNotificationModal(true);
              }}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)] relative transition-colors cursor-pointer"
              title="Reminders & Notifications"
            >
              <Bell size={17} />
              {remindersCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {remindersCount}
                </span>
              )}
            </button>

            {/* Auth Profile / Sign-in */}
            <button
              onClick={() => {
                haptics.tap();
                setShowAuthModal(true);
              }}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] hover:border-amber-500/60 text-xs transition-colors cursor-pointer"
              title={currentUser ? `Signed in as ${currentUser.email}` : 'Sign In / Register'}
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="User"
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <User size={14} className={currentUser ? 'text-amber-500' : 'text-[var(--text-muted)]'} />
              )}
              <span className="text-[11px] font-medium text-[var(--text-main)] hidden sm:inline truncate max-w-[80px]">
                {currentUser ? currentUser.displayName || currentUser.email?.split('@')[0] : 'Sign In'}
              </span>
            </button>
          </div>
        </header>

        {/* Android In-App APK / PWA Install Prompt Banner */}
        <AndroidInstallBanner onOpenAndroidCenter={() => setShowAndroidCenter(true)} />

        {/* Horizontal Category Navigation Track */}
        <div className="h-10 border-b border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none scrollbar-none">
          {[
            { id: 'path', label: 'Today', icon: Calendar },
            { id: 'dynamic_plan', label: 'AI Plan', icon: Sparkles },
            { id: 'plants', label: 'Plants', icon: Leaf },
            { id: 'articles', label: 'Guides', icon: FileText },
            { id: 'community', label: 'Forum', icon: MessageSquare },
            { id: 'bible', label: 'Scripture', icon: BookOpen },
            { id: 'guide', label: 'Guide', icon: Compass },
            { id: 'saved', label: 'Journal', icon: Bookmark },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id as TabType)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--text-main)] text-[var(--bg-main)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)]'
                }`}
              >
                <Icon size={12} className={isCurrent ? '' : 'opacity-70'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main View Area */}
        <div className="flex-1 w-full overflow-y-auto p-3 md:p-4 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'path' && (
              <motion.div
                key="tab-path"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <DailyPathView
                  onNavigateToReader={(book, chapter) =>
                    handleOpenPassage(book || readerTarget.book, chapter || readerTarget.chapter)
                  }
                  onSaveReflection={handleAddNote}
                />
              </motion.div>
            )}

            {activeTab === 'dynamic_plan' && (
              <motion.div
                key="tab-dynamic-plan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <DynamicPlanView
                  onSelectPassage={(book, chapter, verse) =>
                    handleOpenPassage(book, chapter, verse)
                  }
                  onSaveReflection={handleAddNote}
                />
              </motion.div>
            )}

            {activeTab === 'plants' && (
              <motion.div
                key="tab-plants"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <PlantCareView
                  onSelectPassage={(book, chapter) => handleOpenPassage(book, chapter)}
                />
              </motion.div>
            )}

            {activeTab === 'articles' && (
              <motion.div
                key="tab-articles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <ArticlesView
                  onSelectPassage={(book, chapter) => handleOpenPassage(book, chapter)}
                />
              </motion.div>
            )}

            {activeTab === 'community' && (
              <motion.div
                key="tab-community"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <CommunityForumView />
              </motion.div>
            )}

            {activeTab === 'guide' && (
              <motion.div
                key="tab-guide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <GuideView
                  onOpenPassage={handleOpenPassage}
                  onSaveBookmark={(bm) => handleToggleBookmark(bm.book, bm.chapter, bm.verse)}
                  onSaveNote={handleAddNote}
                />
              </motion.div>
            )}

            {activeTab === 'bible' && (
              <motion.div
                key="tab-bible"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <BibleReaderView
                  initialBook={readerTarget.book}
                  initialChapter={readerTarget.chapter}
                  initialVerse={readerTarget.verse}
                  highlights={highlights}
                  bookmarks={bookmarks}
                  onToggleHighlight={handleToggleHighlight}
                  onRemoveHighlight={handleRemoveHighlight}
                  onToggleBookmark={handleToggleBookmark}
                  onAddNote={handleAddNote}
                  onAskGuide={handleAskGuide}
                />
              </motion.div>
            )}

            {activeTab === 'saved' && (
              <motion.div
                key="tab-saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <SavedItemsView
                  bookmarks={bookmarks}
                  highlights={highlights}
                  notes={notes}
                  onDeleteBookmark={handleDeleteBookmark}
                  onDeleteHighlight={handleDeleteHighlight}
                  onDeleteNote={handleDeleteNote}
                  onOpenPassage={handleOpenPassage}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="tab-settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <SettingsView
                  currentTheme={theme}
                  onSelectTheme={setTheme}
                  onClearAllData={handleClearAllData}
                  onExportData={handleExportData}
                  currentUser={currentUser}
                  onOpenAuth={() => setShowAuthModal(true)}
                  onOpenNotifications={() => setShowNotificationModal(true)}
                  isStandalone={isInstalled}
                  isInstallable={isInstallable}
                  onTriggerInstall={install}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Android Material 3 Bottom Navigation Bar */}
        <nav
          id="main-bottom-navigation"
          className="h-16 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 flex items-center justify-around shrink-0 z-30 select-none shadow-xs pb-safe"
        >
          {/* Today Tab */}
          <button
            id="tab-btn-path"
            onClick={() => handleSelectTab('path')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'path'
                ? 'text-[var(--accent-gold)] font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-muted)]'
            }`}
          >
            <div
              className={`flex items-center justify-center transition-all ${
                activeTab === 'path'
                  ? 'px-3.5 py-0.5 rounded-full bg-[var(--accent-gold)]/15'
                  : 'p-0.5'
              }`}
            >
              <Calendar size={18} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Today</span>
          </button>

          {/* Dynamic AI Plan Tab */}
          <button
            id="tab-btn-plan"
            onClick={() => handleSelectTab('dynamic_plan')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'dynamic_plan'
                ? 'text-[var(--accent-gold)] font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-muted)]'
            }`}
          >
            <div
              className={`relative flex items-center justify-center transition-all ${
                activeTab === 'dynamic_plan'
                  ? 'px-3.5 py-0.5 rounded-full bg-[var(--accent-gold)]/15'
                  : 'p-0.5'
              }`}
            >
              <Sparkles size={18} />
              <span className="absolute top-0 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">AI Plan</span>
          </button>

          {/* Plant Care Tab */}
          <button
            id="tab-btn-plants"
            onClick={() => handleSelectTab('plants')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'plants'
                ? 'text-emerald-500 font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-muted)]'
            }`}
          >
            <div
              className={`flex items-center justify-center transition-all ${
                activeTab === 'plants'
                  ? 'px-3.5 py-0.5 rounded-full bg-emerald-500/15'
                  : 'p-0.5'
              }`}
            >
              <Leaf size={18} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Plants</span>
          </button>

          {/* Bible Tab */}
          <button
            id="tab-btn-bible"
            onClick={() => handleSelectTab('bible')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'bible'
                ? 'text-[var(--accent-gold)] font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-muted)]'
            }`}
          >
            <div
              className={`flex items-center justify-center transition-all ${
                activeTab === 'bible'
                  ? 'px-3.5 py-0.5 rounded-full bg-[var(--accent-gold)]/15'
                  : 'p-0.5'
              }`}
            >
              <BookOpen size={18} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Bible</span>
          </button>

          {/* Settings Tab */}
          <button
            id="tab-btn-settings"
            onClick={() => handleSelectTab('settings')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'text-[var(--accent-gold)] font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-muted)]'
            }`}
          >
            <div
              className={`flex items-center justify-center transition-all ${
                activeTab === 'settings'
                  ? 'px-3.5 py-0.5 rounded-full bg-[var(--accent-gold)]/15'
                  : 'p-0.5'
              }`}
            >
              <Settings size={18} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Settings</span>
          </button>
        </nav>

        {/* Global Modals */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          currentUser={currentUser}
        />

        <NotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          onNavigateTab={(tab) => handleSelectTab(tab)}
        />

        {/* Android Package & AAB/APK Center Modal */}
        <AndroidPackageModal
          isOpen={showAndroidCenter}
          onClose={() => setShowAndroidCenter(false)}
          isStandalone={isInstalled}
          isInstallable={isInstallable}
          onTriggerInstall={install}
        />

        {/* In-App Push Notification Confirmation Toast */}
        <AnimatePresence>
          {inAppToast && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[99] max-w-sm w-[90%] p-3 rounded-2xl bg-[var(--bg-surface)] border border-amber-500/40 shadow-2xl flex items-start gap-2.5 text-xs pointer-events-auto"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
                <Bell size={14} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-main)] text-[11px]">
                  Rooted Guide Notification
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  {inAppToast}
                </p>
              </div>
              <button
                onClick={() => setInAppToast(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] flex justify-center text-[var(--text-main)]">
      <div className="w-full max-w-lg h-screen flex flex-col bg-[var(--bg-main)] shadow-xl relative overflow-hidden sm:border-x sm:border-[var(--border-subtle)]">
        {renderAppContent()}
      </div>
    </div>
  );
}
