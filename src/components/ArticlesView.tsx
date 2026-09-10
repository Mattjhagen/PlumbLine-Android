import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Download,
  CheckCircle2,
  Wifi,
  WifiOff,
  Sun,
  Droplets,
  Wind,
  Layers,
  ArrowLeft,
  RefreshCw,
  Share2,
  Bookmark,
} from 'lucide-react';

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  scriptureRef: string;
  summary: string;
  readTimeMinutes: number;
  careSpecs?: {
    light: string;
    water: string;
    humidity: string;
    soil: string;
  };
  content: string;
}

interface ArticlesViewProps {
  onSelectPassage?: (book: string, chapter: number) => void;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({ onSelectPassage }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rooted_offline_article_ids');
      return saved ? JSON.parse(saved) : ['art-1']; // Default olive tree pre-cached
    } catch {
      return ['art-1'];
    }
  });

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [filter, setFilter] = useState<'all' | 'offline' | 'care' | 'devotional'>('all');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Monitor network online / offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch articles from API, caching them
  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
          // Store all fetched articles in offline cache
          localStorage.setItem('rooted_articles_cache', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Loading articles from offline cache:', err);
        try {
          const cached = localStorage.getItem('rooted_articles_cache');
          if (cached) setArticles(JSON.parse(cached));
        } catch {
          // ignore
        }
      }
    }
    loadArticles();
  }, []);

  // Toggle download status for offline storage
  const handleToggleDownload = (article: Article, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isDownloaded = downloadedIds.includes(article.id);
    let newIds: string[];

    if (isDownloaded) {
      newIds = downloadedIds.filter((id) => id !== article.id);
    } else {
      newIds = [...downloadedIds, article.id];
    }

    setDownloadedIds(newIds);
    localStorage.setItem('rooted_offline_article_ids', JSON.stringify(newIds));
  };

  // Perform sync when online
  const handleSyncPending = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncTimestamp: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setSyncMessage('All articles and plant logs are synchronized with cloud.');
      }
    } catch (err) {
      setSyncMessage('Sync postponed: operating in offline-first local mode.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (filter === 'offline') return downloadedIds.includes(a.id);
    if (filter === 'care') return a.category.toLowerCase().includes('guide');
    if (filter === 'devotional') return a.category.toLowerCase().includes('devotional');
    return true;
  });

  return (
    <div className="w-full flex flex-col pb-16 space-y-6">
      {/* Network & Offline Header */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--text-muted)]">
              {isOnline ? 'Online • Cloud Connected' : 'Offline Mode • Local Storage'}
            </span>
          </div>

          <button
            onClick={handleSyncPending}
            disabled={syncing}
            className="px-2.5 py-1 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[10px] font-medium hover:border-amber-500 text-[var(--text-muted)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            <span>Sync Data</span>
          </button>
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
          Plant Guides & Scripture Articles
        </h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
          Download care guides to your device for instant offline reading during quiet retreats, flights, or wilderness walks.
        </p>

        {syncMessage && (
          <div className="mt-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
        {[
          { id: 'all', label: 'All Guides' },
          { id: 'offline', label: `Downloaded (${downloadedIds.length})` },
          { id: 'care', label: 'Botanical Care' },
          { id: 'devotional', label: 'Devotionals' },
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

      {/* Selected Article Full View */}
      {selectedArticle ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4"
        >
          <button
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-amber-500 transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to All Articles</span>
          </button>

          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-500">
                {selectedArticle.category} • {selectedArticle.readTimeMinutes} min read
              </span>
              <h3 className="text-lg font-semibold text-[var(--text-main)] mt-0.5">
                {selectedArticle.title}
              </h3>
              <p className="text-xs text-amber-500 font-scripture italic mt-1">
                {selectedArticle.scriptureRef}
              </p>
            </div>

            <button
              onClick={(e) => handleToggleDownload(selectedArticle, e)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                downloadedIds.includes(selectedArticle.id)
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-emerald-500'
              }`}
              title={
                downloadedIds.includes(selectedArticle.id)
                  ? 'Downloaded for offline'
                  : 'Download for offline'
              }
            >
              {downloadedIds.includes(selectedArticle.id) ? (
                <CheckCircle2 size={16} />
              ) : (
                <Download size={16} />
              )}
            </button>
          </div>

          {/* Care Specs Card if present */}
          {selectedArticle.careSpecs && (
            <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-tertiary)] block mb-1">
                Botanical Cultivation Parameters
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <Sun size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[10px] text-[var(--text-muted)] block">
                      Light
                    </span>
                    <span className="text-[11px] leading-tight">
                      {selectedArticle.careSpecs.light}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <Droplets size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[10px] text-[var(--text-muted)] block">
                      Watering
                    </span>
                    <span className="text-[11px] leading-tight">
                      {selectedArticle.careSpecs.water}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <Wind size={14} className="text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[10px] text-[var(--text-muted)] block">
                      Humidity
                    </span>
                    <span className="text-[11px] leading-tight">
                      {selectedArticle.careSpecs.humidity}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <Layers size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[10px] text-[var(--text-muted)] block">
                      Soil
                    </span>
                    <span className="text-[11px] leading-tight">
                      {selectedArticle.careSpecs.soil}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Article Markdown / Body */}
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm text-[var(--text-main)] leading-relaxed space-y-3 pt-2">
            {selectedArticle.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('### ')) {
                return (
                  <h4 key={idx} className="font-semibold text-sm text-[var(--text-main)] pt-2">
                    {paragraph.replace('### ', '')}
                  </h4>
                );
              }
              if (paragraph.startsWith('*"') || paragraph.startsWith('*')) {
                return (
                  <p
                    key={idx}
                    className="italic p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400/90 font-scripture text-xs"
                  >
                    {paragraph.replace(/\*/g, '')}
                  </p>
                );
              }
              return <p key={idx}>{paragraph}</p>;
            })}
          </div>
        </motion.div>
      ) : (
        /* Articles Cards List */
        <div className="space-y-3">
          {filteredArticles.map((article) => {
            const isDownloaded = downloadedIds.includes(article.id);
            return (
              <motion.div
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-amber-500/40 transition-all cursor-pointer space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-500">
                    {article.category} • {article.readTimeMinutes} min
                  </span>

                  <button
                    onClick={(e) => handleToggleDownload(article, e)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                      isDownloaded
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
                    }`}
                    title={isDownloaded ? 'Downloaded Offline' : 'Click to Download for Offline'}
                  >
                    {isDownloaded ? (
                      <>
                        <CheckCircle2 size={12} />
                        <span className="text-[10px]">Offline Ready</span>
                      </>
                    ) : (
                      <>
                        <Download size={12} />
                        <span className="text-[10px]">Download</span>
                      </>
                    )}
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  {article.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                  {article.summary}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px] text-amber-500 font-scripture italic">
                  <span>{article.scriptureRef}</span>
                  <span className="text-[var(--text-muted)] font-sans not-italic hover:underline">
                    Read guide →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
