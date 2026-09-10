import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Book,
  Bookmark,
  Highlighter,
  MessageSquare,
  Copy,
  Volume2,
  VolumeX,
  Type,
  Check,
  ArrowLeft,
  X,
  Sliders,
} from 'lucide-react';
import {
  Verse,
  BookInfo,
  Highlight,
  HighlightColor,
  Bookmark as BookmarkType,
  UserNote,
  ReaderPreferences,
} from '../types';

interface BibleReaderViewProps {
  initialBook?: string;
  initialChapter?: number;
  initialVerse?: number;
  highlights: Highlight[];
  bookmarks: BookmarkType[];
  onToggleHighlight: (book: string, chapter: number, verse: number, color: HighlightColor) => void;
  onRemoveHighlight: (book: string, chapter: number, verse: number) => void;
  onToggleBookmark: (book: string, chapter: number, verse: number) => void;
  onAddNote: (note: Omit<UserNote, 'id' | 'createdAt'>) => void;
  onAskGuide: (query: string) => void;
}

const HIGHLIGHT_COLORS: { key: HighlightColor; name: string; bg: string; border: string }[] = [
  { key: 'gold', name: 'Sun Gold', bg: '#FDE68A', border: '#D97706' },
  { key: 'sage', name: 'Meadow Sage', bg: '#D1FAE5', border: '#059669' },
  { key: 'sky', name: 'Morning Sky', bg: '#E0F2FE', border: '#0284C7' },
  { key: 'rose', name: 'Rose Petal', bg: '#FFE4E6', border: '#E11D48' },
];

export const BibleReaderView: React.FC<BibleReaderViewProps> = ({
  initialBook = 'John',
  initialChapter = 3,
  initialVerse,
  highlights,
  bookmarks,
  onToggleHighlight,
  onRemoveHighlight,
  onToggleBookmark,
  onAddNote,
  onAskGuide,
}) => {
  // Navigation state
  const [currentBook, setCurrentBook] = useState<string>(initialBook);
  const [currentChapter, setCurrentChapter] = useState<number>(initialChapter);
  const [isBrowserOpen, setIsBrowserOpen] = useState<boolean>(false);
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected verse for action bar
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [showNoteDialog, setShowNoteDialog] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Browser state
  const [browserTab, setBrowserTab] = useState<'OT' | 'NT' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Preferences & Appearance
  const [showAppearance, setShowAppearance] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => {
    try {
      const saved = localStorage.getItem('plumbline_reader_prefs');
      return saved
        ? JSON.parse(saved)
        : {
            theme: 'system',
            fontFamily: 'serif',
            fontSize: 'medium',
            lineSpacing: 'relaxed',
          };
    } catch {
      return {
        theme: 'system',
        fontFamily: 'serif',
        fontSize: 'medium',
        lineSpacing: 'relaxed',
      };
    }
  });

  // Audio Speech state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load books list once
  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch('/api/bible/books');
        if (res.ok) {
          const data = await res.json();
          setBooks(data);
        }
      } catch (err) {
        console.warn('Could not load books list', err);
      }
    }
    loadBooks();
  }, []);

  // Sync when initialBook / initialChapter props change
  useEffect(() => {
    if (initialBook) setCurrentBook(initialBook);
    if (initialChapter) setCurrentChapter(initialChapter);
  }, [initialBook, initialChapter]);

  // Load verses whenever currentBook or currentChapter changes
  useEffect(() => {
    let isMounted = true;
    async function loadChapterVerses() {
      setLoading(true);
      setSelectedVerse(null);
      stopAudio();
      try {
        const res = await fetch(
          `/api/bible/chapter?book=${encodeURIComponent(currentBook)}&chapter=${currentChapter}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setVerses(data);
            // Save last reading position to localStorage
            try {
              localStorage.setItem(
                'plumbline_last_read',
                JSON.stringify({ book: currentBook, chapter: currentChapter })
              );
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.error('Error fetching chapter verses:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadChapterVerses();
    return () => {
      isMounted = false;
    };
  }, [currentBook, currentChapter]);

  // Handle Search in Browser
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/bible/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.warn('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Audio speech handling
  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const startAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech synthesis audio is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    const chapterText = `${currentBook}, chapter ${currentChapter}. ` + verses.map((v) => v.text).join(' ');
    const utterance = new SpeechSynthesisUtterance(chapterText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlayingAudio(false);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  // Chapter navigation helpers
  const currentBookInfo = books.find((b) => b.name === currentBook);
  const totalChapters = currentBookInfo?.total_chapters || 1;

  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(currentChapter - 1);
    } else {
      // jump to previous book if available
      const idx = books.findIndex((b) => b.name === currentBook);
      if (idx > 0) {
        const prevBook = books[idx - 1];
        setCurrentBook(prevBook.name);
        setCurrentChapter(prevBook.total_chapters);
      }
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < totalChapters) {
      setCurrentChapter(currentChapter + 1);
    } else {
      // jump to next book if available
      const idx = books.findIndex((b) => b.name === currentBook);
      if (idx !== -1 && idx < books.length - 1) {
        const nextBook = books[idx + 1];
        setCurrentBook(nextBook.name);
        setCurrentChapter(1);
      }
    }
  };

  const handleCopyVerse = (v: Verse) => {
    navigator.clipboard.writeText(`"${v.text}" — ${v.book} ${v.chapter}:${v.verse} (WEB)`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSaveNoteSubmit = () => {
    if (!selectedVerse || !noteContent.trim()) return;
    onAddNote({
      kind: 'note',
      book: selectedVerse.book,
      chapter: selectedVerse.chapter,
      verse: selectedVerse.verse,
      content: noteContent.trim(),
    });
    setNoteContent('');
    setShowNoteDialog(false);
  };

  const fontSizeClass =
    preferences.fontSize === 'small'
      ? 'text-[15px] leading-relaxed'
      : preferences.fontSize === 'large'
      ? 'text-[19px] leading-loose'
      : preferences.fontSize === 'xlarge'
      ? 'text-[22px] leading-loose'
      : 'text-[17px] leading-relaxed';

  // -------------------------------------------------------------
  // BIBLE BROWSER VIEW (66 Books & Chapter Grid)
  // -------------------------------------------------------------
  if (isBrowserOpen) {
    const filteredBooks = books.filter((b) => {
      if (browserTab === 'OT') return b.testament === 'OT';
      if (browserTab === 'NT') return b.testament === 'NT';
      return true;
    });

    return (
      <div
        id="bible-browser"
        className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden"
      >
        {/* Browser Header */}
        <div className="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
          <button
            id="btn-back-to-reader"
            onClick={() => setIsBrowserOpen(false)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-main)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Reader</span>
          </button>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-muted)]">
            Canonical Books
          </span>
          <div className="w-16" />
        </div>

        {/* Search Input Bar */}
        <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] text-xs">
            <Search size={14} className="text-[var(--text-tertiary)]" />
            <input
              id="bible-search-input"
              type="text"
              placeholder="Search verses, phrases, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-main)]"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Content: Search results or 66 Books list */}
        {searchQuery.trim().length >= 2 ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="text-xs text-[var(--text-tertiary)] flex items-center justify-between">
              <span>Search Results for "{searchQuery}"</span>
              <span>{searchResults.length} verses found</span>
            </div>

            {isSearching ? (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-8">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-8">
                No verses found matching "{searchQuery}".
              </p>
            ) : (
              searchResults.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setCurrentBook(v.book);
                    setCurrentChapter(v.chapter);
                    setIsBrowserOpen(false);
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] transition-colors cursor-pointer space-y-1"
                >
                  <div className="text-xs font-semibold text-[var(--accent-gold)]">
                    {v.book} {v.chapter}:{v.verse}
                  </div>
                  <p className="font-scripture text-sm text-[var(--text-main)] italic">
                    "{v.text}"
                  </p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
            {/* Testament Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-xs self-center">
              <button
                onClick={() => setBrowserTab('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  browserTab === 'ALL'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                All (66)
              </button>
              <button
                onClick={() => setBrowserTab('OT')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  browserTab === 'OT'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                Old Testament (39)
              </button>
              <button
                onClick={() => setBrowserTab('NT')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  browserTab === 'NT'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                New Testament (27)
              </button>
            </div>

            {/* Books List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-6">
              {filteredBooks.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--text-main)]">{b.name}</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {b.total_chapters} {b.total_chapters === 1 ? 'ch' : 'chs'}
                    </span>
                  </div>

                  {/* Chapter Chips Grid */}
                  <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
                    {Array.from({ length: b.total_chapters }, (_, i) => i + 1).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => {
                          setCurrentBook(b.name);
                          setCurrentChapter(ch);
                          setIsBrowserOpen(false);
                        }}
                        className={`w-7 h-7 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center ${
                          currentBook === b.name && currentChapter === ch
                            ? 'bg-[var(--accent-gold)] text-white font-bold'
                            : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--accent-gold-light)] hover:text-[var(--accent-gold)]'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // CHAPTER READER VIEW
  // -------------------------------------------------------------
  return (
    <div
      id="bible-reader"
      className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden relative"
    >
      {/* Top Header Bar */}
      <div className="h-12 border-b border-[var(--border-subtle)] px-3 flex items-center justify-between shrink-0 bg-[var(--bg-surface)] z-20">
        {/* Book & Chapter Selector Button */}
        <button
          id="btn-open-browser"
          onClick={() => setIsBrowserOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[var(--bg-muted)] transition-colors text-xs font-semibold text-[var(--text-main)] cursor-pointer"
        >
          <Book size={14} className="text-[var(--accent-gold)]" />
          <span>
            {currentBook} {currentChapter}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] ml-1">▼</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Audio Speech Button */}
          <button
            onClick={startAudio}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              isPlayingAudio
                ? 'bg-amber-100 dark:bg-amber-900/50 text-[var(--accent-gold)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)]'
            }`}
            title={isPlayingAudio ? 'Stop reading audio' : 'Listen to chapter aloud'}
          >
            {isPlayingAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Typography Controls Button */}
          <button
            onClick={() => setShowAppearance(!showAppearance)}
            className="p-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            title="Reader typography settings"
          >
            <Type size={15} />
          </button>

          {/* Prev / Next chapter */}
          <div className="flex items-center border-l border-[var(--border-subtle)] ml-1 pl-1 gap-0.5">
            <button
              onClick={handlePrevChapter}
              className="p-1.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              title="Previous chapter"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextChapter}
              className="p-1.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              title="Next chapter"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Typography settings flyout */}
      <AnimatePresence>
        {showAppearance && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] p-3 text-xs space-y-2 overflow-hidden z-20"
          >
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] font-medium">Font Family:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const updated = { ...preferences, fontFamily: 'serif' as const };
                    setPreferences(updated);
                    localStorage.setItem('plumbline_reader_prefs', JSON.stringify(updated));
                  }}
                  className={`px-3 py-1 rounded font-serif ${
                    preferences.fontFamily === 'serif'
                      ? 'bg-[var(--text-main)] text-[var(--bg-main)]'
                      : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                  }`}
                >
                  Serif
                </button>
                <button
                  onClick={() => {
                    const updated = { ...preferences, fontFamily: 'sans' as const };
                    setPreferences(updated);
                    localStorage.setItem('plumbline_reader_prefs', JSON.stringify(updated));
                  }}
                  className={`px-3 py-1 rounded font-sans ${
                    preferences.fontFamily === 'sans'
                      ? 'bg-[var(--text-main)] text-[var(--bg-main)]'
                      : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                  }`}
                >
                  Sans
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] font-medium">Text Size:</span>
              <div className="flex gap-1">
                {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      const updated = { ...preferences, fontSize: sz };
                      setPreferences(updated);
                      localStorage.setItem('plumbline_reader_prefs', JSON.stringify(updated));
                    }}
                    className={`px-2.5 py-1 rounded capitalize ${
                      preferences.fontSize === sz
                        ? 'bg-[var(--text-main)] text-[var(--bg-main)]'
                        : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                    }`}
                  >
                    {sz.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verses Scroll Area */}
      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-6 h-6 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-tertiary)]">
              Loading {currentBook} {currentChapter}...
            </span>
          </div>
        ) : (
          <div
            className={`space-y-3 ${
              preferences.fontFamily === 'serif' ? 'font-scripture' : 'font-sans'
            } ${fontSizeClass}`}
          >
            {/* Chapter Header */}
            <div className="text-center py-4 border-b border-[var(--border-subtle)]/60 mb-4 not-italic">
              <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--accent-gold)] font-semibold font-sans block">
                World English Bible
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-main)] mt-1 font-sans">
                {currentBook} {currentChapter}
              </h2>
            </div>

            {/* Verses List */}
            {verses.map((v) => {
              const verseHighlight = highlights.find(
                (h) => h.book === v.book && h.chapter === v.chapter && h.verse === v.verse
              );
              const isBookmarked = bookmarks.some(
                (b) => b.book === v.book && b.chapter === v.chapter && b.verse === v.verse
              );
              const isSelected = selectedVerse?.verse === v.verse;

              // Compute background color for highlight if active
              let highlightBg = 'transparent';
              if (verseHighlight) {
                const colorObj = HIGHLIGHT_COLORS.find((c) => c.key === verseHighlight.color);
                highlightBg = colorObj ? colorObj.bg : '#FDE68A';
              }

              return (
                <span
                  key={v.verse}
                  onClick={() => setSelectedVerse(isSelected ? null : v)}
                  className={`inline cursor-pointer transition-all rounded px-1 py-0.5 relative group ${
                    isSelected ? 'ring-1 ring-[var(--accent-gold)]' : ''
                  }`}
                  style={{
                    backgroundColor: verseHighlight ? highlightBg : 'transparent',
                    color: verseHighlight ? '#1C1917' : 'inherit',
                  }}
                >
                  <sup className="text-[10px] font-sans font-medium text-[var(--text-tertiary)] mr-1 select-none not-italic">
                    {isBookmarked && (
                      <Bookmark
                        size={9}
                        className="inline mr-0.5 text-[var(--accent-gold)] fill-[var(--accent-gold)]"
                      />
                    )}
                    {v.verse}
                  </sup>
                  <span className="group-hover:opacity-85">{v.text} </span>
                </span>
              );
            })}

            {/* Chapter Footer Navigation */}
            <div className="pt-8 pb-12 flex items-center justify-between border-t border-[var(--border-subtle)] mt-8 not-italic font-sans text-xs">
              <button
                onClick={handlePrevChapter}
                className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setIsBrowserOpen(true)}
                className="text-[var(--accent-gold)] font-medium"
              >
                Browse Books
              </button>
              <button
                onClick={handleNextChapter}
                className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Verse Action Bar (Shown when a verse is tapped) */}
      <AnimatePresence>
        {selectedVerse && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-4 left-4 right-4 max-w-md mx-auto p-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl z-30 flex flex-col space-y-2 text-xs"
          >
            <div className="flex items-center justify-between px-1 pb-1 border-b border-[var(--border-subtle)]/60">
              <span className="font-semibold text-[var(--text-main)]">
                {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.verse}
              </span>
              <button
                onClick={() => setSelectedVerse(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-main)]"
              >
                <X size={14} />
              </button>
            </div>

            {/* Actions Grid */}
            <div className="flex items-center justify-between gap-1">
              {/* Highlight Color Pickers */}
              <div className="flex items-center gap-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      onToggleHighlight(
                        selectedVerse.book,
                        selectedVerse.chapter,
                        selectedVerse.verse,
                        c.key
                      );
                    }}
                    className="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: c.bg }}
                    title={`Highlight in ${c.name}`}
                  />
                ))}
                {/* Clear highlight button */}
                <button
                  onClick={() => {
                    onRemoveHighlight(
                      selectedVerse.book,
                      selectedVerse.chapter,
                      selectedVerse.verse
                    );
                  }}
                  className="w-6 h-6 rounded-full bg-[var(--bg-muted)] text-[var(--text-tertiary)] flex items-center justify-center text-[10px] hover:text-[var(--text-main)]"
                  title="Clear highlight"
                >
                  ✕
                </button>
              </div>

              {/* Bookmark Toggle */}
              <button
                onClick={() => {
                  onToggleBookmark(
                    selectedVerse.book,
                    selectedVerse.chapter,
                    selectedVerse.verse
                  );
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="Bookmark verse"
              >
                <Bookmark size={15} />
              </button>

              {/* Add Note Button */}
              <button
                onClick={() => setShowNoteDialog(true)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="Add reflection or note"
              >
                <MessageSquare size={15} />
              </button>

              {/* Copy verse */}
              <button
                onClick={() => handleCopyVerse(selectedVerse)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="Copy verse text"
              >
                {copySuccess ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>

              {/* Ask Guide */}
              <button
                onClick={() => {
                  onAskGuide(
                    `Tell me about ${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}: "${selectedVerse.text}"`
                  );
                }}
                className="px-2.5 py-1 rounded-full bg-[var(--accent-gold)] text-white font-medium text-[11px] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Ask Guide
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Modal Dialog */}
      <AnimatePresence>
        {showNoteDialog && selectedVerse && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[var(--text-main)]">
                  Add Note for {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.verse}
                </span>
                <button
                  onClick={() => setShowNoteDialog(false)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-main)]"
                >
                  <X size={14} />
                </button>
              </div>

              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your personal reflection or prayer..."
                className="w-full p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] outline-none text-sm text-[var(--text-main)] leading-relaxed resize-none"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowNoteDialog(false)}
                  className="px-3 py-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNoteSubmit}
                  disabled={!noteContent.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[var(--accent-gold)] text-white font-medium disabled:opacity-40 cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
