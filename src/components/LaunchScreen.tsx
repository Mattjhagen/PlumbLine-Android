import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PlumbLineLogo } from './PlumbLineLogo';
import { Verse } from '../types';

interface LaunchScreenProps {
  onContinue: () => void;
}

export const LaunchScreen: React.FC<LaunchScreenProps> = ({ onContinue }) => {
  const [verseText, setVerseText] = useState<string>('');
  const [reference, setReference] = useState<string>('John 3:16');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchDailyVerse() {
      try {
        const res = await fetch('/api/bible/verse-of-the-day');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.verses && data.verses.length > 0) {
            const combined = data.verses.map((v: Verse) => v.text).join(' ');
            setVerseText(combined);
            const r = data.ref;
            setReference(
              r.verseStart === r.verseEnd
                ? `${r.book} ${r.chapter}:${r.verseStart}`
                : `${r.book} ${r.chapter}:${r.verseStart}-${r.verseEnd}`
            );
          }
        }
      } catch (err) {
        console.warn('Failed to load verse of the day, using default', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDailyVerse();
    return () => {
      isMounted = false;
    };
  }, []);

  const defaultVerse =
    'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.';

  return (
    <div
      id="launch-screen"
      className="relative flex flex-col justify-between items-center min-h-full w-full px-6 py-10 select-none"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      {/* Brand Header with app-logo-adaptive.png */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-3 pt-6"
      >
        <div className="relative p-1 rounded-2xl bg-gradient-to-b from-amber-500/20 to-transparent">
          <img
            src="/app-logo-adaptive.png"
            alt="Plumb Line Logo"
            className="w-20 h-20 rounded-2xl object-cover shadow-lg border border-[var(--border-subtle)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <PlumbLineLogo size={18} useImage={false} color="var(--accent-gold)" />
          <span className="text-[12px] font-bold tracking-[0.25em] uppercase text-[var(--text-main)]">
            PLUMB LINE
          </span>
        </div>
        <span className="text-[11px] tracking-wider text-[var(--text-tertiary)] uppercase">Rooted Guide Edition</span>
      </motion.div>

      {/* Animated plumb line indicator */}
      <div className="w-full max-w-xs my-6 overflow-hidden h-[1px] bg-[var(--border-subtle)] relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
          className="h-full bg-[var(--accent-gold)]"
        />
      </div>

      {/* Scripture Verse of the Day */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="flex-1 flex flex-col justify-center items-center text-center max-w-md px-4"
      >
        <span className="text-[11px] tracking-[0.18em] uppercase text-[var(--text-tertiary)] mb-4 font-semibold">
          Verse of the Day
        </span>

        <h2 className="text-xl font-semibold tracking-tight mb-4 text-[var(--text-main)]">
          {reference}
        </h2>

        <p className="font-scripture text-lg md:text-xl leading-relaxed text-[var(--text-main)] italic">
          "{loading ? defaultVerse : verseText || defaultVerse}"
        </p>

        <span className="text-xs text-[var(--text-tertiary)] mt-3">World English Bible</span>
      </motion.div>

      {/* Continue Action */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="w-full max-w-xs pb-4"
      >
        <button
          id="btn-continue-app"
          onClick={onContinue}
          className="w-full py-3.5 px-6 rounded-full font-medium text-sm tracking-wide bg-[var(--text-main)] text-[var(--bg-main)] shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue to Plumb Line</span>
        </button>
      </motion.div>
    </div>
  );
};
