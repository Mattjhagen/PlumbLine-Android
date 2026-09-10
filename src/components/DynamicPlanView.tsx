import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  Send,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Leaf,
  Calendar,
  Clock,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface DynamicDay {
  day: number;
  title: string;
  focus: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  arrivePrompt: string;
  reflectPrompt: string;
  respondPrompt: string;
  verses?: { verse: number; text: string }[];
}

interface DynamicPlan {
  title: string;
  subtitle: string;
  botanicalMetaphor: string;
  days: DynamicDay[];
}

interface DynamicPlanViewProps {
  onSelectPassage: (book: string, chapter: number, verse?: number) => void;
  onSaveReflection?: (text: string, title: string) => void;
}

export const DynamicPlanView: React.FC<DynamicPlanViewProps> = ({
  onSelectPassage,
  onSaveReflection,
}) => {
  // Questionnaire intake state
  const [season, setSeason] = useState('Seeking direction & peace');
  const [struggles, setStruggles] = useState('Feeling spiritually dry and anxious about decisions');
  const [desire, setDesire] = useState('Deep inner quiet, steady faith, and living water');
  const [depth, setDepth] = useState<'gentle' | 'focused' | 'deep'>('focused');
  const [minutes, setMinutes] = useState(15);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<DynamicPlan | null>(() => {
    try {
      const saved = localStorage.getItem('rooted_dynamic_bible_plan');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [userDayReflection, setUserDayReflection] = useState('');
  const [adapting, setAdapting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/plans/generate-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: {
            season,
            struggles,
            desire,
            depth,
            minutesPerDay: minutes,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          setPlan(data.plan);
          setActiveDayIdx(0);
          localStorage.setItem('rooted_dynamic_bible_plan', JSON.stringify(data.plan));
        }
      }
    } catch (err) {
      console.error('Failed to generate plan:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Re-adapt plan dynamically with the user's reflection answers
  const handleAdaptWithAnswer = async () => {
    if (!userDayReflection.trim() || !plan) return;
    setAdapting(true);
    try {
      const res = await fetch('/api/plans/generate-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { season, struggles, desire, depth, minutesPerDay: minutes },
          previousFeedback: `User completed Day ${activeDayIdx + 1} (${plan.days[activeDayIdx].title}). Reflection: "${userDayReflection}". Please tailor subsequent days to deepen their walk based on this answer.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          // Keep completed day, adapt rest
          const mergedDays = [...plan.days];
          if (Array.isArray(data.plan.days)) {
            for (let i = activeDayIdx + 1; i < mergedDays.length && i < data.plan.days.length; i++) {
              mergedDays[i] = data.plan.days[i];
            }
          }
          const updated = { ...plan, days: mergedDays };
          setPlan(updated);
          localStorage.setItem('rooted_dynamic_bible_plan', JSON.stringify(updated));
          setSavedSuccess(true);
          setUserDayReflection('');
          if (onSaveReflection) {
            onSaveReflection(
              `Day ${activeDayIdx + 1}: ${plan.days[activeDayIdx].title}\nReflection: ${userDayReflection}`,
              plan.title
            );
          }
          setTimeout(() => setSavedSuccess(false), 3000);
        }
      }
    } catch (err) {
      console.error('Failed to adapt plan:', err);
    } finally {
      setAdapting(false);
    }
  };

  const activeDay = plan?.days[activeDayIdx];

  return (
    <div className="w-full flex flex-col pb-16 space-y-6">
      {/* Banner / Title */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
            <Sparkles size={16} />
          </span>
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-amber-500">
            OpenRouter AI Engine
          </span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
          Dynamic Scripture Plan
        </h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
          Rooted Guide uses OpenRouter AI to formulate a responsive Bible journey that bends and adapts as you write your daily answers.
        </p>
      </div>

      {/* If no plan generated yet, show interactive questionnaire */}
      {!plan ? (
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4">
          <h3 className="text-sm font-semibold tracking-wide text-[var(--text-main)]">
            Personalize Your Plan
          </h3>

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Current Spiritual Season
            </label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="e.g. Navigating change, waiting on God, rebuilding habits"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Current Burdens or Tensions
            </label>
            <input
              type="text"
              value={struggles}
              onChange={(e) => setStruggles(e.target.value)}
              placeholder="e.g. Anxiety about future, weariness, distracted mind"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
              Heart's Deepest Longing
            </label>
            <input
              type="text"
              value={desire}
              onChange={(e) => setDesire(e.target.value)}
              placeholder="e.g. Stillness before God, courage to love, rooted discernment"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Study Depth
              </label>
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value as any)}
                className="w-full px-2 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
              >
                <option value="gentle">Gentle (1-3 Verses)</option>
                <option value="focused">Focused (Short Chapter)</option>
                <option value="deep">Deep (Rich Passage)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                Daily Time
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-xs">
                <Clock size={14} className="text-amber-500" />
                <span>{minutes} minutes</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="w-full mt-3 py-3 px-4 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-semibold text-xs tracking-wide hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Formulating Dynamic Plan via OpenRouter...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-amber-400" />
                <span>Formulate Dynamic Bible Plan</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Generated Dynamic Plan View */
        <div className="space-y-6">
          {/* Plan Header */}
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-500 flex items-center gap-1">
                <Leaf size={12} /> Rooted Pathway
              </span>
              <button
                onClick={() => setPlan(null)}
                className="text-[11px] text-[var(--text-muted)] hover:text-amber-500 transition-colors cursor-pointer"
              >
                Reset / New Plan
              </button>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-main)] tracking-tight">
              {plan.title}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{plan.subtitle}</p>

            {plan.botanicalMetaphor && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs italic flex items-center gap-2">
                <Leaf size={14} className="shrink-0" />
                <span>"{plan.botanicalMetaphor}"</span>
              </div>
            )}

            {/* Days Horizontal Pill Track */}
            <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
              {plan.days.map((d, i) => (
                <button
                  key={d.day}
                  onClick={() => setActiveDayIdx(i)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDayIdx === i
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-amber-500/50'
                  }`}
                >
                  <span>Day {d.day}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Day Detail */}
          {activeDay && (
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <span className="text-[10px] tracking-widest font-bold uppercase text-amber-500">
                    Day {activeDay.day} of 5
                  </span>
                  <h4 className="text-base font-semibold text-[var(--text-main)]">
                    {activeDay.title}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{activeDay.focus}</p>
                </div>

                <button
                  onClick={() =>
                    onSelectPassage(activeDay.book, activeDay.chapter, activeDay.verseStart)
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
                >
                  <BookOpen size={13} />
                  <span>Open in Bible</span>
                </button>
              </div>

              {/* Arrive Prompt */}
              <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-tertiary)] block mb-1">
                  Step 1: Arrive & Stillness
                </span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed">
                  {activeDay.arrivePrompt}
                </p>
              </div>

              {/* Passage Preview */}
              <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-500">
                    {activeDay.book} {activeDay.chapter}:{activeDay.verseStart}–{activeDay.verseEnd}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase">WEB Bible</span>
                </div>

                {activeDay.verses && activeDay.verses.length > 0 ? (
                  <div className="space-y-1.5 font-scripture text-xs md:text-sm text-[var(--text-main)] leading-relaxed">
                    {activeDay.verses.map((v) => (
                      <p key={v.verse}>
                        <sup className="text-[9px] text-amber-500 mr-1">{v.verse}</sup>
                        {v.text}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Tap "Open in Bible" above to immerse yourself in the full chapter.
                  </p>
                )}
              </div>

              {/* Reflect Prompt */}
              <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-tertiary)] block mb-1">
                  Step 2: Reflective Question
                </span>
                <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed">
                  {activeDay.reflectPrompt}
                </p>
              </div>

              {/* Respond Prompt & Dynamic Adaptation Input */}
              <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-2.5">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-500 block mb-1">
                    Step 3: Respond & Adapt Tomorrow
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    {activeDay.respondPrompt}
                  </p>
                </div>

                <textarea
                  rows={3}
                  value={userDayReflection}
                  onChange={(e) => setUserDayReflection(e.target.value)}
                  placeholder="Type your honest prayer or reflection here. The plan will dynamically adapt future days based on your words..."
                  className="w-full p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500 resize-none"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {savedSuccess ? '✓ Reflection saved & plan adapted!' : 'Adapts days 2-5'}
                  </span>

                  <button
                    onClick={handleAdaptWithAnswer}
                    disabled={adapting || !userDayReflection.trim()}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {adapting ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    <span>Save & Adapt Plan</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
