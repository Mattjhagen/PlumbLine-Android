import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bookmark,
  Highlighter,
  MessageSquare,
  Search,
  Trash2,
  Download,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { PlumbLineLogo } from './PlumbLineLogo';
import { Bookmark as BookmarkType, Highlight, UserNote } from '../types';

interface SavedItemsViewProps {
  bookmarks: BookmarkType[];
  highlights: Highlight[];
  notes: UserNote[];
  onDeleteBookmark: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onOpenPassage: (book: string, chapter: number, verse?: number) => void;
}

type FilterCategory = 'all' | 'bookmarks' | 'highlights' | 'reflections' | 'prayers' | 'notes';

export const SavedItemsView: React.FC<SavedItemsViewProps> = ({
  bookmarks,
  highlights,
  notes,
  onDeleteBookmark,
  onDeleteHighlight,
  onDeleteNote,
  onOpenPassage,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Combined unified items list
  interface UnifiedItem {
    id: string;
    type: 'bookmark' | 'highlight' | 'note' | 'reflection' | 'prayer';
    title: string;
    subtitle?: string;
    preview?: string;
    book?: string;
    chapter?: number;
    verse?: number;
    color?: string;
    createdAt: string;
  }

  const allItems: UnifiedItem[] = [
    ...bookmarks.map((b) => ({
      id: b.id,
      type: 'bookmark' as const,
      title: `${b.book} ${b.chapter}:${b.verse}`,
      subtitle: 'Bookmarked Verse',
      book: b.book,
      chapter: b.chapter,
      verse: b.verse,
      createdAt: b.createdAt,
    })),
    ...highlights.map((h) => ({
      id: h.id,
      type: 'highlight' as const,
      title: `${h.book} ${h.chapter}:${h.verse}`,
      subtitle: `Highlighted (${h.color})`,
      color: h.color,
      book: h.book,
      chapter: h.chapter,
      verse: h.verse,
      createdAt: h.createdAt,
    })),
    ...notes.map((n) => ({
      id: n.id,
      type: n.kind,
      title: n.book && n.chapter ? `${n.book} ${n.chapter}${n.verse ? `:${n.verse}` : ''}` : 'Personal Entry',
      subtitle: n.kind === 'prayer' ? 'Prayer' : n.kind === 'reflection' ? 'Reflection' : 'Personal Note',
      preview: n.content,
      book: n.book,
      chapter: n.chapter,
      verse: n.verse,
      createdAt: n.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter items
  const filtered = allItems.filter((item) => {
    // Category match
    if (filter === 'bookmarks' && item.type !== 'bookmark') return false;
    if (filter === 'highlights' && item.type !== 'highlight') return false;
    if (filter === 'reflections' && item.type !== 'reflection') return false;
    if (filter === 'prayers' && item.type !== 'prayer') return false;
    if (filter === 'notes' && item.type !== 'note') return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchPreview = item.preview?.toLowerCase().includes(q);
      return matchTitle || matchSubtitle || matchPreview;
    }
    return true;
  });

  // Export data handler
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
    a.download = `plumbline-journal-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="saved-items-view"
      className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden"
    >
      {/* Header */}
      <div className="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <PlumbLineLogo size={18} color="var(--accent-gold)" />
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-main)]">
            Saved Journal
          </span>
        </div>
        <button
          onClick={handleExportData}
          className="flex items-center gap-1 text-xs text-[var(--accent-gold)] hover:underline font-medium cursor-pointer"
          title="Export private journal as JSON"
        >
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] text-xs">
          <Search size={14} className="text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search saved reflections, notes, bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-subtle)] overflow-x-auto text-xs shrink-0">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'reflections', label: 'Reflections' },
            { id: 'prayers', label: 'Prayers' },
            { id: 'notes', label: 'Notes' },
            { id: 'bookmarks', label: 'Bookmarks' },
            { id: 'highlights', label: 'Highlights' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors cursor-pointer ${
              filter === t.id
                ? 'bg-[var(--text-main)] text-[var(--bg-main)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-[var(--text-tertiary)] max-w-xs mx-auto space-y-2">
            <Bookmark size={24} className="opacity-40 mb-2" />
            <p className="font-semibold text-sm text-[var(--text-muted)]">No saved items found</p>
            <p>
              As you read Scripture and walk today’s path, your bookmarks, reflections, and prayers
              will appear here.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] transition-all space-y-2 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.type === 'bookmark' && (
                    <Bookmark size={14} className="text-[var(--accent-gold)] fill-[var(--accent-gold)]" />
                  )}
                  {item.type === 'highlight' && (
                    <Highlighter size={14} className="text-amber-500" />
                  )}
                  {item.type === 'reflection' && (
                    <Sparkles size={14} className="text-[var(--accent-gold)]" />
                  )}
                  {item.type === 'prayer' && (
                    <MessageSquare size={14} className="text-indigo-400" />
                  )}
                  {item.type === 'note' && (
                    <MessageSquare size={14} className="text-emerald-500" />
                  )}
                  <span className="font-semibold text-sm text-[var(--text-main)]">
                    {item.title}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => {
                    if (item.type === 'bookmark') onDeleteBookmark(item.id);
                    else if (item.type === 'highlight') onDeleteHighlight(item.id);
                    else onDeleteNote(item.id);
                  }}
                  className="text-[var(--text-tertiary)] hover:text-rose-500 transition-colors p-1 opacity-60 hover:opacity-100 cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {item.preview && (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap font-scripture italic text-sm">
                  "{item.preview}"
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/40 text-[11px] text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </span>

                {item.book && item.chapter && (
                  <button
                    onClick={() => onOpenPassage(item.book!, item.chapter!, item.verse)}
                    className="flex items-center gap-1 text-[var(--accent-gold)] font-medium hover:underline cursor-pointer"
                  >
                    <BookOpen size={11} />
                    <span>Open in Bible</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
