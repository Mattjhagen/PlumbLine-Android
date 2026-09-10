import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { PlumbLineLogo } from './PlumbLineLogo';
import { DailyPathModule, ModuleType, Verse, UserNote } from '../types';

interface DailyPathViewProps {
  onNavigateToReader: (book?: string, chapter?: number) => void;
  onSaveReflection: (note: Omit<UserNote, 'id' | 'createdAt'>) => void;
}

const MODULES: DailyPathModule[] = [
  {
    type: 'arrive',
    title: 'Arrive',
    prompt: 'Take a quiet moment to settle. What are you bringing into this time with Scripture?',
    placeholder: 'Name any worries, hopes, or distractions on your mind...',
  },
  {
    type: 'read',
    title: 'Read',
    prompt: 'Read this passage slowly, once or twice. Listen for words that catch your attention.',
    placeholder: '',
  },
  {
    type: 'reflect',
    title: 'Reflect',
    prompt: 'What word, phrase, or truth remains in your thoughts? Why might it be calling to you?',
    placeholder: 'Write your reflections here...',
  },
  {
    type: 'respond',
    title: 'Respond',
    prompt: 'How does this invitation meet you today? What faithful step is being invited?',
    placeholder: 'Note any response, choice, or commitment...',
  },
  {
    type: 'close',
    title: 'Close',
    prompt: 'Offer a brief closing thought, word of gratitude, or prayer to God before continuing.',
    placeholder: 'Speak or write your closing prayer...',
  },
];

export const DailyPathView: React.FC<DailyPathViewProps> = ({
  onNavigateToReader,
  onSaveReflection,
}) => {
  // Persistence state
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number>(0);
  const [drafts, setDrafts] = useState<Record<ModuleType, string>>({
    arrive: '',
    read: '',
    reflect: '',
    respond: '',
    close: '',
  });

  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completedTimestamp, setCompletedTimestamp] = useState<number | null>(null);
  const [passageVerses, setPassageVerses] = useState<Verse[]>([]);
  const [passageRef, setPassageRef] = useState({
    book: 'John',
    chapter: 3,
    verseStart: 16,
    verseEnd: 17,
  });

  // 12-Hour Gate live countdown calculation
  const [timeLeftStr, setTimeLeftStr] = useState<string>('12h 00m');
  const [isGateLocked, setIsGateLocked] = useState<boolean>(false);

  // Load session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('plumbline_daily_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.drafts) setDrafts(parsed.drafts);
        if (parsed.isStarted) setIsStarted(parsed.isStarted);
        if (parsed.currentModuleIndex !== undefined)
          setCurrentModuleIndex(parsed.currentModuleIndex);
        if (parsed.completedTimestamp) {
          setCompletedTimestamp(parsed.completedTimestamp);
          setIsCompleted(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch today's passage
  useEffect(() => {
    async function loadPassage() {
      try {
        const res = await fetch('/api/bible/verse-of-the-day');
        if (res.ok) {
          const data = await res.json();
          if (data.verses && data.verses.length > 0) {
            setPassageVerses(data.verses);
            setPassageRef(data.ref);
          }
        }
      } catch (err) {
        console.warn('Could not load daily passage', err);
      }
    }
    loadPassage();
  }, []);

  // Check 12-hour gate lock status
  useEffect(() => {
    if (!completedTimestamp) {
      setIsGateLocked(false);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      const unlockTime = completedTimestamp + twelveHoursMs;
      const diff = unlockTime - now;

      if (diff > 0) {
        setIsGateLocked(true);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setIsGateLocked(false);
        setIsCompleted(false);
        setCompletedTimestamp(null);
        localStorage.removeItem('plumbline_daily_session');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [completedTimestamp]);

  // Save session state to localStorage
  const saveSession = (
    startedVal: boolean,
    modIdx: number,
    draftsVal: Record<ModuleType, string>,
    compTime: number | null
  ) => {
    try {
      localStorage.setItem(
        'plumbline_daily_session',
        JSON.stringify({
          isStarted: startedVal,
          currentModuleIndex: modIdx,
          drafts: draftsVal,
          completedTimestamp: compTime,
        })
      );
    } catch {
      // ignore
    }
  };

  const handleStart = () => {
    setIsStarted(true);
    saveSession(true, 0, drafts, null);
  };

  const handleNextModule = () => {
    const currentMod = MODULES[currentModuleIndex];
    // If the user wrote something in reflection or response, save it to user reflections journal
    if (
      (currentMod.type === 'reflect' || currentMod.type === 'respond') &&
      drafts[currentMod.type].trim()
    ) {
      onSaveReflection({
        kind: 'reflection',
        book: passageRef.book,
        chapter: passageRef.chapter,
        verse: passageRef.verseStart,
        content: `[${currentMod.title}] ${drafts[currentMod.type].trim()}`,
      });
    }

    if (currentMod.type === 'close' && drafts.close.trim()) {
      onSaveReflection({
        kind: 'prayer',
        book: passageRef.book,
        chapter: passageRef.chapter,
        verse: passageRef.verseStart,
        content: `[Closing Prayer] ${drafts.close.trim()}`,
      });
    }

    if (currentModuleIndex < MODULES.length - 1) {
      const nextIdx = currentModuleIndex + 1;
      setCurrentModuleIndex(nextIdx);
      saveSession(true, nextIdx, drafts, null);
    } else {
      // Finish practice and activate 12-hour gate
      const now = Date.now();
      setIsCompleted(true);
      setCompletedTimestamp(now);
      saveSession(true, currentModuleIndex, drafts, now);
      window.dispatchEvent(new CustomEvent('rooted_tasks_changed', { detail: { type: 'daily_path', completed: true } }));
    }
  };

  const handleResetSession = () => {
    if (confirm('Reset today’s devotional practice to start over?')) {
      setIsStarted(false);
      setIsCompleted(false);
      setCompletedTimestamp(null);
      setCurrentModuleIndex(0);
      setDrafts({ arrive: '', read: '', reflect: '', respond: '', close: '' });
      localStorage.removeItem('plumbline_daily_session');
      window.dispatchEvent(new CustomEvent('rooted_tasks_changed', { detail: { type: 'daily_path', completed: false } }));
    }
  };

  const currentMod = MODULES[currentModuleIndex];

  // -------------------------------------------------------------
  // STATE 3: PATH COMPLETED & 12-HOUR DEVOTIONAL GATE
  // -------------------------------------------------------------
  if (isCompleted) {
    return (
      <div
        id="daily-path-completed"
        className="flex flex-col items-center justify-between h-full w-full bg-[var(--bg-main)] px-6 py-10 text-[var(--text-main)] text-center overflow-y-auto"
      >
        <div className="w-full flex justify-end">
          <button
            onClick={handleResetSession}
            className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors cursor-pointer"
            title="Restart today's devotional"
          >
            <RotateCcw size={11} />
            <span>Reflect Again</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-1 flex flex-col items-center justify-center max-w-sm"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--accent-gold-light)] flex items-center justify-center text-[var(--accent-gold)] mb-5 shadow-sm">
            <CheckCircle2 size={32} />
          </div>

          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--text-tertiary)] mb-2">
            Practice Complete
          </span>

          <h2 className="text-2xl font-semibold tracking-tight mb-3 text-[var(--text-main)]">
            You have walked today's path.
          </h2>

          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 font-scripture italic text-base">
            "Your word is a lamp to my feet, and a light for my path." — Psalm 119:105
          </p>

          {/* 12-Hour Devotional Gate Box */}
          <div className="w-full p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] mb-6 text-left shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-main)] mb-1">
              <span className="flex items-center gap-1.5 text-[var(--accent-gold)]">
                <Lock size={13} />
                <span>12-Hour Devotional Gate Active</span>
              </span>
              <span className="font-mono text-[11px] bg-[var(--bg-muted)] px-2 py-0.5 rounded text-[var(--text-muted)]">
                {timeLeftStr}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
              Plumb Line protects your quiet rhythm. A new guided devotional will open after your
              interval. Until then, continue immersing yourself in the full Scriptures.
            </p>
          </div>

          {/* Single Dominant Call to Action (per Home Redesign Summary) */}
          <button
            id="btn-continue-reading"
            onClick={() => onNavigateToReader(passageRef.book, passageRef.chapter)}
            className="w-full py-3.5 px-6 rounded-full bg-[var(--text-main)] text-[var(--bg-main)] font-medium text-sm shadow hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen size={16} />
            <span>Continue Reading in Bible</span>
          </button>
        </motion.div>

        <p className="text-[11px] text-[var(--text-tertiary)] max-w-xs">
          All your reflections and prayers from today have been privately stored in your Saved
          journal.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 1: BEFORE PRACTICE (WELCOME & INTENTION)
  // -------------------------------------------------------------
  if (!isStarted) {
    return (
      <div
        id="daily-path-intro"
        className="flex flex-col items-center justify-between h-full w-full bg-[var(--bg-main)] px-6 py-10 text-[var(--text-main)] text-center overflow-y-auto"
      >
        <div className="flex items-center gap-2 pt-2">
          <PlumbLineLogo size={18} color="var(--accent-gold)" />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
            Daily Devotional
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex-1 flex flex-col items-center justify-center max-w-sm"
        >
          <span className="text-xs text-[var(--accent-gold)] font-semibold tracking-wider uppercase mb-2">
            Today's Focused Path
          </span>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3 text-[var(--text-main)]">
            {passageRef.book} {passageRef.chapter}:{passageRef.verseStart}
            {passageRef.verseStart !== passageRef.verseEnd ? `-${passageRef.verseEnd}` : ''}
          </h2>

          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 font-scripture text-base italic">
            "He restores my soul. He leads me in paths of righteousness for his name's sake."
          </p>

          <div className="w-full p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-left mb-6 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold">
              <Clock size={14} className="text-[var(--accent-gold)]" />
              <span>A 10–15 minute unhurried progression:</span>
            </div>
            <div className="grid grid-cols-5 gap-1 pt-2 text-[10px] text-center font-medium">
              <div className="p-1.5 rounded bg-[var(--bg-muted)] text-[var(--text-main)]">1. Arrive</div>
              <div className="p-1.5 rounded bg-[var(--bg-muted)] text-[var(--text-main)]">2. Read</div>
              <div className="p-1.5 rounded bg-[var(--bg-muted)] text-[var(--text-main)]">3. Reflect</div>
              <div className="p-1.5 rounded bg-[var(--bg-muted)] text-[var(--text-main)]">4. Respond</div>
              <div className="p-1.5 rounded bg-[var(--bg-muted)] text-[var(--text-main)]">5. Close</div>
            </div>
          </div>

          <button
            id="btn-start-path"
            onClick={handleStart}
            className="w-full py-3.5 px-6 rounded-full bg-[var(--text-main)] text-[var(--bg-main)] font-medium text-sm shadow hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Begin Today's Path</span>
            <ArrowRight size={15} />
          </button>
        </motion.div>

        <p className="text-[11px] text-[var(--text-tertiary)]">
          Private on-device journaling • No data ever sold or tracked
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: IN PROGRESS (5-MODULE SEQUENCE)
  // -------------------------------------------------------------
  return (
    <div
      id="daily-path-module-container"
      className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden"
    >
      {/* Module Progress Header */}
      <div className="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <PlumbLineLogo size={16} color="var(--accent-gold)" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-main)]">
            {currentMod.title}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            ({currentModuleIndex + 1} of {MODULES.length})
          </span>
        </div>

        <button
          onClick={handleResetSession}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors"
          title="Restart from beginning"
        >
          <RotateCcw size={12} />
          <span className="hidden sm:inline">Start Over</span>
        </button>
      </div>

      {/* 3px Thin Step Progress Bar */}
      <div className="w-full h-[3px] bg-[var(--border-subtle)] flex">
        {MODULES.map((m, idx) => (
          <div
            key={m.type}
            className="flex-1 h-full transition-colors duration-300"
            style={{
              backgroundColor:
                idx <= currentModuleIndex ? 'var(--accent-gold)' : 'transparent',
            }}
          />
        ))}
      </div>

      {/* Module Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col justify-between max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMod.type}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <span className="text-[11px] tracking-wider uppercase text-[var(--accent-gold)] font-bold block">
              Step {currentModuleIndex + 1}: {currentMod.title}
            </span>

            <h3 className="text-lg font-semibold tracking-tight text-[var(--text-main)] leading-snug">
              {currentMod.prompt}
            </h3>

            {/* Read Module Scripture View */}
            {currentMod.type === 'read' ? (
              <div className="my-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]/60 text-xs font-semibold text-[var(--text-main)]">
                  <span>
                    {passageRef.book} {passageRef.chapter}:{passageRef.verseStart}
                    {passageRef.verseStart !== passageRef.verseEnd ? `-${passageRef.verseEnd}` : ''}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase">
                    World English Bible
                  </span>
                </div>
                <div className="font-scripture text-base md:text-lg leading-relaxed space-y-2 text-[var(--text-main)] italic">
                  {passageVerses.map((v) => (
                    <p key={v.verse}>
                      <sup className="text-xs font-sans font-normal text-[var(--text-tertiary)] mr-1 not-italic">
                        {v.verse}
                      </sup>
                      {v.text}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              /* Writing / Reflection Textarea */
              <div className="mt-4">
                <textarea
                  id={`input-module-${currentMod.type}`}
                  rows={5}
                  value={drafts[currentMod.type]}
                  onChange={(e) => {
                    const newDrafts = { ...drafts, [currentMod.type]: e.target.value };
                    setDrafts(newDrafts);
                    saveSession(true, currentModuleIndex, newDrafts, null);
                  }}
                  placeholder={currentMod.placeholder}
                  className="w-full p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] leading-relaxed resize-none shadow-sm transition-colors"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation Action */}
        <div className="pt-6">
          <button
            id="btn-next-module"
            onClick={handleNextModule}
            className="w-full py-3.5 px-6 rounded-full bg-[var(--text-main)] text-[var(--bg-main)] font-medium text-sm shadow hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {currentModuleIndex < MODULES.length - 1
                ? `Continue to ${MODULES[currentModuleIndex + 1].title}`
                : 'Complete Today’s Practice'}
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
