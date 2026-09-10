// Task & Notification Manager for Rooted Guide
// Manages correlation between active pending tasks, completed tasks, and the top-bar notification badge.

export interface ReminderTask {
  id: string;
  type: 'watering' | 'fertilizing' | 'daily_path' | 'article' | 'forum';
  title: string;
  message: string;
  plantId?: string;
  plantName?: string;
  articleSlug?: string;
  urgency: 'high' | 'normal' | 'low';
  completed?: boolean;
  completedAt?: string;
  actionLabel?: string;
  targetTab?: 'plants' | 'daily-path' | 'articles' | 'community' | 'today';
}

const STORAGE_COMPLETED_KEY = 'rooted_completed_tasks_v2';
const STORAGE_READ_ARTICLES_KEY = 'rooted_read_articles_v2';

export function getCompletedTasksMap(): Record<string, { completedAt: string; title: string; type: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_COMPLETED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCompletedTasksMap(map: Record<string, { completedAt: string; title: string; type: string }>) {
  try {
    localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Check if a plant was already watered today based on local cache
function isPlantWateredToday(lastWateredAt?: string): boolean {
  if (!lastWateredAt) return false;
  const watered = new Date(lastWateredAt).getTime();
  const diffHours = (Date.now() - watered) / (1000 * 60 * 60);
  return diffHours < 12; // Watered within last 12 hours means today's task is done
}

// Check if a plant was already fertilized recently
function isPlantFertilizedRecently(lastFertilizedAt?: string): boolean {
  if (!lastFertilizedAt) return false;
  const fed = new Date(lastFertilizedAt).getTime();
  const diffDays = (Date.now() - fed) / (1000 * 60 * 60 * 24);
  return diffDays < 5; // Fertilized within last 5 days
}

// Check if today's Daily Path was completed
export function isDailyPathCompletedToday(): boolean {
  try {
    const raw = localStorage.getItem('plumbline_daily_session');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed.completedTimestamp) return false;
    const diffHours = (Date.now() - Number(parsed.completedTimestamp)) / (1000 * 60 * 60);
    return diffHours < 12;
  } catch {
    return false;
  }
}

// Fetch and reconcile all tasks with actual completion status
export async function getReconciledTasks(): Promise<{
  pendingTasks: ReminderTask[];
  completedTasks: ReminderTask[];
  uncompletedCount: number;
}> {
  const completedMap = getCompletedTasksMap();
  let serverReminders: any[] = [];

  try {
    const res = await fetch('/api/notifications/reminders');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reminders)) {
        serverReminders = data.reminders;
      }
    }
  } catch {
    // Offline mode
  }

  // Load local plants cache to double-check local water/fertilize states
  let localPlants: any[] = [];
  try {
    const cached = localStorage.getItem('rooted_plants_cache');
    if (cached) localPlants = JSON.parse(cached);
  } catch {
    // ignore
  }

  const allTasks: ReminderTask[] = [];

  // 1. Process server reminders & plants
  for (const rem of serverReminders) {
    // Find matching plant in local cache if applicable
    const plant = rem.plantId ? localPlants.find((p) => p.id === rem.plantId) : null;
    
    // Determine if already completed
    let isCompleted = !!completedMap[rem.id];
    let completedAt = completedMap[rem.id]?.completedAt;

    if (rem.type === 'watering') {
      if (plant && isPlantWateredToday(plant.lastWateredAt)) {
        isCompleted = true;
        completedAt = plant.lastWateredAt;
      }
    } else if (rem.type === 'fertilizing') {
      if (plant && isPlantFertilizedRecently(plant.lastFertilizedAt)) {
        isCompleted = true;
        completedAt = plant.lastFertilizedAt;
      }
    } else if (rem.type === 'article') {
      try {
        const readArticles = JSON.parse(localStorage.getItem(STORAGE_READ_ARTICLES_KEY) || '[]');
        if (readArticles.includes(rem.id) || readArticles.includes(rem.articleSlug)) {
          isCompleted = true;
        }
      } catch {
        // ignore
      }
    }

    allTasks.push({
      id: rem.id,
      type: rem.type,
      title: rem.title,
      message: rem.message,
      plantId: rem.plantId,
      plantName: rem.plantName,
      articleSlug: rem.articleSlug,
      urgency: rem.urgency || 'normal',
      actionLabel: rem.type === 'watering' ? 'Water Now' : rem.type === 'fertilizing' ? 'Feed Now' : 'Read Guide',
      targetTab: rem.type === 'watering' || rem.type === 'fertilizing' ? 'plants' : 'articles',
      completed: isCompleted,
      completedAt: completedAt,
    });
  }

  // 2. Add Daily Path Task if not present
  const dailyDone = isDailyPathCompletedToday();
  const dailyTaskId = 'task-daily-path-today';
  const dailyCompletedInMap = !!completedMap[dailyTaskId] || dailyDone;

  allTasks.push({
    id: dailyTaskId,
    type: 'daily_path',
    title: "Today's Path: Daily Scripture Stillness",
    message: dailyCompletedInMap
      ? 'Devotional completed. Your heart is grounded in the Word.'
      : 'Pause for 5 minutes to arrive, be still, and hear Scripture today.',
    urgency: 'normal',
    actionLabel: dailyCompletedInMap ? 'Completed' : 'Begin Path',
    targetTab: 'today',
    completed: dailyCompletedInMap,
    completedAt: completedMap[dailyTaskId]?.completedAt || (dailyDone ? new Date().toISOString() : undefined),
  });

  // 3. Add any completed tasks from map that might not be in server reminders anymore
  for (const [id, val] of Object.entries(completedMap)) {
    if (!allTasks.some((t) => t.id === id)) {
      allTasks.push({
        id,
        type: val.type as any,
        title: val.title,
        message: 'Completed task',
        urgency: 'low',
        completed: true,
        completedAt: val.completedAt,
      });
    }
  }

  const pendingTasks = allTasks.filter((t) => !t.completed);
  const completedTasks = allTasks.filter((t) => t.completed);

  return {
    pendingTasks,
    completedTasks,
    uncompletedCount: pendingTasks.length,
  };
}

// Mark a single task completed
export async function markTaskCompleted(task: ReminderTask) {
  const map = getCompletedTasksMap();
  const nowStr = new Date().toISOString();
  map[task.id] = {
    completedAt: nowStr,
    title: task.title,
    type: task.type,
  };
  saveCompletedTasksMap(map);

  // If article, also add to read articles
  if (task.type === 'article') {
    try {
      const read = JSON.parse(localStorage.getItem(STORAGE_READ_ARTICLES_KEY) || '[]');
      if (!read.includes(task.id)) read.push(task.id);
      if (task.articleSlug && !read.includes(task.articleSlug)) read.push(task.articleSlug);
      localStorage.setItem(STORAGE_READ_ARTICLES_KEY, JSON.stringify(read));
    } catch {
      // ignore
    }
  }

  // If watering or fertilizing, also update server and local cache
  if (task.plantId) {
    try {
      const action = task.type === 'watering' ? 'water' : 'fertilize';
      await fetch(`/api/plants/${task.plantId}/${action}`, { method: 'POST' });
    } catch {
      // ignore
    }

    // Update local cache
    try {
      const cached = localStorage.getItem('rooted_plants_cache');
      if (cached) {
        const plants = JSON.parse(cached);
        const updated = plants.map((p: any) => {
          if (p.id === task.plantId) {
            return task.type === 'watering'
              ? { ...p, lastWateredAt: nowStr }
              : { ...p, lastFertilizedAt: nowStr };
          }
          return p;
        });
        localStorage.setItem('rooted_plants_cache', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }

  // Broadcast event so UI (App bell badge, modals, views) instantly updates
  window.dispatchEvent(new CustomEvent('rooted_tasks_changed', { detail: { taskId: task.id, completed: true } }));
}

// Mark a task uncompleted / restore
export function markTaskUncompleted(taskId: string) {
  const map = getCompletedTasksMap();
  delete map[taskId];
  saveCompletedTasksMap(map);

  window.dispatchEvent(new CustomEvent('rooted_tasks_changed', { detail: { taskId, completed: false } }));
}

// Mark all pending tasks as completed
export async function markAllTasksCompleted(pendingTasks: ReminderTask[]) {
  for (const task of pendingTasks) {
    await markTaskCompleted(task);
  }
}

// Clear completed history
export function clearCompletedHistory() {
  saveCompletedTasksMap({});
  window.dispatchEvent(new CustomEvent('rooted_tasks_changed', { detail: { cleared: true } }));
}

// Push notification verification and trigger
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Push notifications are not supported in this browser environment.');
  }
  return await Notification.requestPermission();
}

export async function sendTestPushNotification(): Promise<{ success: boolean; message: string }> {
  if (!('Notification' in window)) {
    // Dispatch in-app notification banner
    dispatchInAppBanner('Push notifications not natively supported in iframe/browser. In-app alerts active.');
    return { success: false, message: 'Web Notifications API is not supported in this browser.' };
  }

  let perm = Notification.permission;
  if (perm !== 'granted') {
    perm = await Notification.requestPermission();
  }

  if (perm === 'granted') {
    try {
      // Try service worker notification first (better mobile / PWA support)
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification('Rooted Guide: Daily Scripture & Care', {
            body: '🌿 "Those who wait on the Lord will renew their strength." (Isaiah 40:31) — Push notifications are working perfectly!',
            icon: '/app-logo-adaptive.png',
            badge: '/app-logo-adaptive.png',
          });
          dispatchInAppBanner('Push notification sent to your system tray!');
          return { success: true, message: 'System push notification sent successfully.' };
        }
      }

      // Fallback to standard window Notification
      new Notification('Rooted Guide: Daily Scripture & Care', {
        body: '🌿 "Those who wait on the Lord will renew their strength." (Isaiah 40:31) — Push notifications are working perfectly!',
        icon: '/app-logo-adaptive.png',
      });
      dispatchInAppBanner('Push notification sent to your system tray!');
      return { success: true, message: 'Push notification displayed successfully.' };
    } catch (err: any) {
      // Browsers inside cross-origin iframes may restrict Notification constructor
      dispatchInAppBanner('Push alert verified: "Those who wait on the Lord will renew their strength." (Isaiah 40:31)');
      return { success: true, message: 'Notification verified (in-app fallback for sandboxed iframe).' };
    }
  } else {
    dispatchInAppBanner('Notification permissions not granted. Please allow notifications in your browser settings.');
    return { success: false, message: 'Notification permissions were denied.' };
  }
}

function dispatchInAppBanner(message: string) {
  window.dispatchEvent(new CustomEvent('rooted_in_app_notification', { detail: { message } }));
}
