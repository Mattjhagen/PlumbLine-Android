import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  Droplets,
  Sparkles,
  BookOpen,
  MessageSquare,
  Compass,
  CheckCircle,
  CheckCircle2,
  Check,
  Send,
  RotateCcw,
  Trash2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  ReminderTask,
  getReconciledTasks,
  markTaskCompleted,
  markTaskUncompleted,
  markAllTasksCompleted,
  clearCompletedHistory,
  sendTestPushNotification,
  requestPushPermission,
} from '../utils/taskNotificationManager';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: any) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [pendingTasks, setPendingTasks] = useState<ReminderTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<ReminderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<string>('default');

  const refreshTasks = useCallback(async () => {
    try {
      const data = await getReconciledTasks();
      setPendingTasks(data.pendingTasks);
      setCompletedTasks(data.completedTasks);
    } catch (err) {
      console.warn('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshTasks();
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, [isOpen, refreshTasks]);

  // Listen for task changes triggered elsewhere
  useEffect(() => {
    const handleChanged = () => {
      refreshTasks();
    };
    window.addEventListener('rooted_tasks_changed', handleChanged);
    return () => window.removeEventListener('rooted_tasks_changed', handleChanged);
  }, [refreshTasks]);

  if (!isOpen) return null;

  const handleCompleteTask = async (task: ReminderTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markTaskCompleted(task);
    await refreshTasks();
  };

  const handleRestoreTask = (task: ReminderTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    markTaskUncompleted(task.id);
    refreshTasks();
  };

  const handleCompleteAll = async () => {
    await markAllTasksCompleted(pendingTasks);
    await refreshTasks();
  };

  const handleTestPush = async () => {
    setTestPushStatus('Triggering push alert...');
    try {
      const res = await sendTestPushNotification();
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      }
      setTestPushStatus(res.success ? 'Delivered!' : 'Alert triggered');
    } catch {
      setTestPushStatus('Alert sent');
    }
    setTimeout(() => setTestPushStatus(null), 3500);
  };

  const handleEnablePush = async () => {
    try {
      const perm = await requestPushPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        await handleTestPush();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        id="notifications-modal-container"
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-[var(--border-subtle)] relative flex flex-col max-h-[85vh] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer transition-colors"
          title="Close modal"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Bell size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                Tasks & Reminders
              </h3>
              {pendingTasks.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  {pendingTasks.length} pending
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Correlates live with your daily care tasks, devotions, and guides.
            </p>
          </div>
        </div>

        {/* Push Notification Verification Banner */}
        <div className="mt-3 mb-3 p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Smartphone size={15} className="text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[var(--text-main)] text-[11px]">
                  Push Notifications:
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                    pushPermission === 'granted'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : pushPermission === 'denied'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {pushPermission === 'granted'
                    ? 'Active'
                    : pushPermission === 'denied'
                    ? 'Blocked in Browser'
                    : 'Prompt'}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                {pushPermission === 'granted'
                  ? 'System notifications active for daily care & Scripture.'
                  : 'Enable browser notifications for watering reminders.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {pushPermission !== 'granted' && (
              <button
                onClick={handleEnablePush}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-semibold text-[11px] hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Enable
              </button>
            )}
            <button
              onClick={handleTestPush}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)] hover:border-amber-500/40 transition-colors flex items-center gap-1 cursor-pointer"
              title="Test push notification right now"
            >
              <Send size={11} className="text-amber-400" />
              <span>{testPushStatus || 'Test Push'}</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Pending vs Completed */}
        <div className="flex items-center border-b border-[var(--border-subtle)] mb-3 text-xs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 px-3 font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'text-[var(--accent-gold)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <span>Action Required</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                pendingTasks.length > 0
                  ? 'bg-red-500/20 text-red-400 font-bold'
                  : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
              }`}
            >
              {pendingTasks.length}
            </span>
            {activeTab === 'pending' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-gold)]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-2 px-3 font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'text-[var(--accent-gold)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <span>Completed Tasks</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
              {completedTasks.length}
            </span>
            {activeTab === 'completed' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-gold)]"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[160px]">
          {loading ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              Syncing active tasks...
            </div>
          ) : activeTab === 'pending' ? (
            pendingTasks.length === 0 ? (
              <div className="py-10 text-center text-xs text-emerald-400 flex flex-col items-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle size={26} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--text-main)]">
                    All Tasks Completed!
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 max-w-xs">
                    Your plants are watered, devotions are up to date, and the notification badge is cleared.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onClose();
                      if (task.targetTab) onNavigateTab(task.targetTab);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      task.urgency === 'high'
                        ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-amber-500/40'
                    }`}
                  >
                    {/* Icon */}
                    <div className="p-2 rounded-lg bg-[var(--bg-main)] shrink-0 text-center">
                      {task.type === 'watering' && <Droplets size={16} className="text-cyan-400" />}
                      {task.type === 'fertilizing' && <Sparkles size={16} className="text-amber-400" />}
                      {task.type === 'daily_path' && <Compass size={16} className="text-amber-500" />}
                      {task.type === 'article' && <BookOpen size={16} className="text-emerald-400" />}
                      {task.type === 'forum' && <MessageSquare size={16} className="text-teal-400" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-semibold text-[var(--text-main)] truncate">
                          {task.title}
                        </h4>
                        {task.urgency === 'high' && (
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider shrink-0">
                            Due Today
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                        {task.message}
                      </p>

                      {/* Action buttons */}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={(e) => handleCompleteTask(task, e)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          title="Mark task as completed"
                        >
                          <Check size={11} />
                          <span>{task.actionLabel || 'Mark Complete'}</span>
                        </button>

                        <span className="text-[10px] text-[var(--text-tertiary)] hover:underline">
                          View details →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Completed Tasks Tab
            completedTasks.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="opacity-40" />
                <span>No completed tasks archived yet.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 px-1 text-[11px] text-[var(--text-muted)]">
                  <span>Archive of recently completed tasks</span>
                  <button
                    onClick={clearCompletedHistory}
                    className="hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <Trash2 size={10} />
                    <span>Clear Archive</span>
                  </button>
                </div>
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]/70 opacity-80 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                        <Check size={13} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-main)] line-through decoration-[var(--text-muted)]">
                          {task.title}
                        </h4>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Completed {task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleRestoreTask(task, e)}
                      className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                      title="Restore to pending tasks"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
          {pendingTasks.length > 0 ? (
            <button
              onClick={handleCompleteAll}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-main)] hover:border-emerald-500/40 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Mark All Done</span>
            </button>
          ) : (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={13} />
              <span>Red notification count: 0 (All clear)</span>
            </span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--accent-gold)] text-black font-semibold text-xs hover:bg-[var(--accent-gold-hover)] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
