import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Heart,
  Plus,
  Share2,
  Tag,
  User,
  Send,
  X,
  Clock,
  Sparkles,
  WifiOff,
} from 'lucide-react';

export interface ForumPost {
  id: string;
  authorName: string;
  title: string;
  content: string;
  category: string;
  likesCount: number;
  createdAt: string;
  isLocalOnly?: boolean;
}

export const CommunityForumView: React.FC = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'plant_care' | 'bible_study' | 'prayer'>('all');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'plant_care' | 'bible_study' | 'prayer'>('plant_care');
  const [authorName, setAuthorName] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/forum/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        localStorage.setItem('rooted_forum_posts_cache', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Loading forum from offline cache:', err);
      try {
        const cached = localStorage.getItem('rooted_forum_posts_cache');
        if (cached) setPosts(JSON.parse(cached));
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = async (postId: string) => {
    if (likedPostIds.includes(postId)) return;
    setLikedPostIds((prev) => [...prev, postId]);

    // Optimistically update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p))
    );

    try {
      await fetch(`/api/forum/posts/${postId}/like`, { method: 'POST' });
    } catch (err) {
      console.warn('Liked offline');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const payload = {
      authorName: authorName.trim() || 'Rooted Pilgrim',
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
    };

    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setPosts((prev) => [created, ...prev]);
      }
    } catch (err) {
      // Offline fallback
      const offlinePost: ForumPost = {
        id: `post-local-${Date.now()}`,
        authorName: payload.authorName,
        title: payload.title,
        content: payload.content,
        category: payload.category,
        likesCount: 0,
        createdAt: new Date().toISOString(),
        isLocalOnly: true,
      };
      setPosts((prev) => [offlinePost, ...prev]);
    } finally {
      setShowNewPostModal(false);
      setNewTitle('');
      setNewContent('');
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (filter === 'all') return true;
    return p.category === filter;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'plant_care':
        return '🌱 Plant Care';
      case 'bible_study':
        return '📖 Scripture Insight';
      case 'prayer':
        return '🙏 Prayer Request';
      default:
        return '💬 Discussion';
    }
  };

  return (
    <div className="w-full flex flex-col pb-16 space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
              <MessageSquare size={16} />
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-amber-500">
              Community Forum
            </span>
          </div>

          <button
            onClick={() => setShowNewPostModal(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            <span>New Post</span>
          </button>
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
          Rooted Community & Prayers
        </h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
          Share practical botanical tips, encourage fellow believers in Scripture, and lift one another in prayer.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
        {[
          { id: 'all', label: 'All Topics' },
          { id: 'plant_care', label: '🌱 Plant Care' },
          { id: 'bible_study', label: '📖 Scripture' },
          { id: 'prayer', label: '🙏 Prayers' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-[var(--text-main)] text-[var(--bg-main)] font-semibold shadow-sm'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-xs text-[var(--text-muted)]">
            Loading community discussions...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <MessageSquare size={32} className="mx-auto text-[var(--text-tertiary)] mb-2" />
            <p className="text-sm font-medium text-[var(--text-main)]">No posts in this category yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
              Be the first to ask a plant question or share an encouraging verse.
            </p>
            <button
              onClick={() => setShowNewPostModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Start Discussion
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">
                    {post.authorName[0]?.toUpperCase() || 'R'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-main)] block">
                      {post.authorName}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-medium">
                  {getCategoryLabel(post.category)}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                {post.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                {post.content}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    likedPostIds.includes(post.id)
                      ? 'text-red-400 font-semibold'
                      : 'text-[var(--text-muted)] hover:text-red-400'
                  }`}
                >
                  <Heart
                    size={14}
                    className={likedPostIds.includes(post.id) ? 'fill-current' : ''}
                  />
                  <span>{post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}</span>
                </button>

                {post.isLocalOnly && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <WifiOff size={11} /> Stored locally (will sync online)
                  </span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl border border-[var(--border-subtle)] shadow-2xl relative"
              style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
            >
              <button
                onClick={() => setShowNewPostModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X size={16} />
              </button>

              <h3 className="text-lg font-semibold mb-1 text-[var(--text-main)]">
                Create Community Post
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Post questions, care insights, or prayer requests.
              </p>

              <form onSubmit={handleCreatePost} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Hannah M."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Topic Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                  >
                    <option value="plant_care">🌱 Plant Care Tip / Question</option>
                    <option value="bible_study">📖 Scripture Reflection</option>
                    <option value="prayer">🙏 Prayer Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Brief headline..."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Message Body *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Write your reflection, question, or prayer details..."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-semibold text-xs tracking-wide hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  Publish to Community
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
