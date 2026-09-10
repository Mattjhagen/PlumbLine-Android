import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  BookOpen,
  Bookmark,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Check,
  Compass,
} from 'lucide-react';
import { PlumbLineLogo } from './PlumbLineLogo';
import {
  GuideTurn,
  GuideServiceResponse,
  CitationReference,
  Bookmark as BookmarkType,
  UserNote,
} from '../types';

interface GuideViewProps {
  onOpenPassage: (book: string, chapter: number, verseStart?: number) => void;
  onSaveBookmark: (bookmark: Omit<BookmarkType, 'id' | 'createdAt'>) => void;
  onSaveNote: (note: Omit<UserNote, 'id' | 'createdAt'>) => void;
}

const INITIAL_SUGGESTIONS = [
  'Finding peace when my mind feels anxious',
  'What does the plumb line symbolize in Amos?',
  'Where does my help come from when I am weary?',
  'How do I offer genuine forgiveness?',
];

export const GuideView: React.FC<GuideViewProps> = ({
  onOpenPassage,
  onSaveBookmark,
  onSaveNote,
}) => {
  const [turns, setTurns] = useState<GuideTurn[]>(() => {
    try {
      const saved = localStorage.getItem('plumbline_guide_turns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [savedCitationId, setSavedCitationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist turns
  useEffect(() => {
    try {
      localStorage.setItem('plumbline_guide_turns', JSON.stringify(turns));
    } catch {
      // ignore
    }
  }, [turns]);

  // Scroll to bottom when turns update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isLoading]);

  const handleSubmit = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userTurn: GuideTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/v1/guide/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: query,
          requestId: `req-${Date.now()}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Guide service HTTP ${res.status}`);
      }

      const data: GuideServiceResponse = await res.json();

      const guideTurn: GuideTurn = {
        id: `guide-${Date.now()}`,
        role: 'guide',
        content: data.text,
        citations: data.citations,
        safetyCategory: data.safetyCategory,
        nextQuestion: data.nextQuestion,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setTurns((prev) => [...prev, guideTurn]);
    } catch (err) {
      console.error('Failed to get guide response:', err);
      const fallbackTurn: GuideTurn = {
        id: `guide-${Date.now()}`,
        role: 'guide',
        content:
          'Take a breath. Scripture reminds us: "The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning." (Lamentations 3:22-23)',
        citations: [
          {
            book: 'Lamentations',
            chapter: 3,
            verse: 22,
            text: 'It is because of the LORD’s mercies that we are not consumed, because his compassion doesn’t fail.',
          },
        ],
        safetyCategory: 'safe',
        nextQuestion: 'What thought or breath is needed in this exact moment?',
        timestamp: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, fallbackTurn]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    if (confirm('Start a fresh conversation with the Guide?')) {
      setTurns([]);
      localStorage.removeItem('plumbline_guide_turns');
    }
  };

  const handleSaveCitation = (c: CitationReference) => {
    onSaveBookmark({
      book: c.book,
      chapter: c.chapter,
      verse: c.verse,
    });
    setSavedCitationId(`${c.book}-${c.chapter}-${c.verse}`);
    setTimeout(() => setSavedCitationId(null), 2000);
  };

  return (
    <div
      id="guide-view"
      className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden"
    >
      {/* Subtle Header */}
      <div className="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <PlumbLineLogo size={18} color="var(--accent-gold)" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-main)]">
            Scripture Guide
          </span>
        </div>
        {turns.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-main)] transition-colors p-1"
            title="Reset conversation"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">New Thread</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {turns.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60%] text-center px-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-gold-light)] flex items-center justify-center mb-4 text-[var(--accent-gold)]">
              <PlumbLineLogo size={26} color="var(--accent-gold)" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight mb-2">The Blinking Cursor</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 font-scripture italic text-base">
              "Behold, the Lord stood on a wall made by a plumb line, with a plumb line in his
              hand." — Amos 7:7
            </p>
            <p className="text-xs text-[var(--text-tertiary)] max-w-xs mb-6">
              Bring your questions, worries, meditations, or scripture passages. Every response is
              rooted directly in the World English Bible.
            </p>

            {/* Quick Inspiration Prompts */}
            <div className="w-full space-y-2 text-left">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold block px-1">
                Reflective Starting Points
              </span>
              {INITIAL_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(s)}
                  className="w-full text-left text-xs p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent-gold)] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="text-[var(--text-main)] group-hover:text-[var(--accent-gold)] transition-colors">
                    {s}
                  </span>
                  <Compass size={14} className="text-[var(--text-tertiary)] shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Turns */}
        {turns.map((turn) => (
          <motion.div
            key={turn.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {turn.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--text-main)] text-[var(--bg-main)] px-4 py-3 text-sm leading-relaxed shadow-sm">
                {turn.content}
              </div>
            ) : (
              <div className="max-w-[95%] w-full space-y-3">
                {/* Safety crisis banner */}
                {turn.safetyCategory === 'crisis' && (
                  <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
                      <span>Support & Help Available 24/7 (Free & Confidential)</span>
                    </div>
                    <p className="leading-relaxed">
                      If you are in immediate danger or distress, please connect with someone who can
                      listen and support you:
                    </p>
                    <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-medium">
                      <span className="bg-amber-200/60 dark:bg-amber-800/40 px-2.5 py-1 rounded">
                        Call or Text <strong>988</strong> (Lifeline)
                      </span>
                      <span className="bg-amber-200/60 dark:bg-amber-800/40 px-2.5 py-1 rounded">
                        Text <strong>HOME</strong> to <strong>741741</strong>
                      </span>
                      <span className="bg-amber-200/60 dark:bg-amber-800/40 px-2.5 py-1 rounded">
                        Domestic Violence: <strong>1-800-799-7233</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Companion's Reflection */}
                <div className="p-4 rounded-2xl rounded-tl-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm leading-relaxed text-[var(--text-main)]">
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--border-subtle)]/60 text-[11px] text-[var(--accent-gold)] font-semibold tracking-wider uppercase">
                    <PlumbLineLogo size={14} color="var(--accent-gold)" />
                    <span>Plumb Line Companion</span>
                  </div>
                  <p className="whitespace-pre-wrap">{turn.content}</p>

                  {/* Scripture Citations */}
                  {turn.citations && turn.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                      <span className="text-[10px] tracking-wider uppercase text-[var(--text-tertiary)] font-bold block">
                        Grounded Scripture (World English Bible)
                      </span>
                      {turn.citations.map((c, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] space-y-1.5 transition-all hover:border-[var(--accent-gold)]"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-main)]">
                            <span className="flex items-center gap-1.5">
                              <BookOpen size={13} className="text-[var(--accent-gold)]" />
                              {c.book} {c.chapter}:{c.verse}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSaveCitation(c)}
                                className="px-2 py-0.5 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Bookmark this verse"
                              >
                                {savedCitationId === `${c.book}-${c.chapter}-${c.verse}` ? (
                                  <>
                                    <Check size={11} className="text-emerald-500" />
                                    <span className="text-emerald-600 text-[10px]">Saved</span>
                                  </>
                                ) : (
                                  <>
                                    <Bookmark size={11} />
                                    <span>Bookmark</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => onOpenPassage(c.book, c.chapter, c.verse)}
                                className="px-2 py-0.5 rounded bg-[var(--accent-gold-light)] text-[var(--accent-gold)] font-medium text-[11px] flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer"
                              >
                                <span>Read Chapter</span>
                              </button>
                            </div>
                          </div>
                          {c.text && (
                            <p className="font-scripture italic text-[13px] leading-relaxed text-[var(--text-muted)] pt-0.5">
                              "{c.text}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Next Question Invitation */}
                  {turn.nextQuestion && (
                    <div className="mt-3.5 pt-2.5 border-t border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)] italic flex items-start gap-1.5">
                      <Sparkles size={13} className="text-[var(--accent-gold)] shrink-0 mt-0.5" />
                      <span>{turn.nextQuestion}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] w-fit"
          >
            <PlumbLineLogo size={15} color="var(--accent-gold)" className="animate-pulse" />
            <span>Consulting Scripture and discerning grounded alignment...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* The Blinking Cursor Composer */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <div className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] focus-within:border-[var(--accent-gold)] transition-colors p-2 flex flex-col">
          <textarea
            id="guide-input-field"
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write what is on your heart or enter a scripture..."
            className="w-full bg-transparent resize-none border-none outline-none text-sm placeholder:text-[var(--text-tertiary)] p-1 text-[var(--text-main)]"
          />

          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/50 mt-1 text-[11px] text-[var(--text-tertiary)] px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-[var(--accent-gold)] inline-block animate-cursor rounded-full" />
              <span>Grounded in World English Bible</span>
            </span>

            <button
              id="btn-send-guide"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="w-7 h-7 rounded-full bg-[var(--text-main)] text-[var(--bg-main)] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              title="Send (Enter)"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
