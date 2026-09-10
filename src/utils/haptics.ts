// Android Native Haptics Feedback Utility
// Provides authentic tactile responses matching Android Jetpack Compose / Material 3 guidelines

export const haptics = {
  // Light tick (8ms) - Bottom navigation tab change, list item select
  selection: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    } catch {
      // ignore
    }
  },

  // Subtle tap (12ms) - Button presses, chips, toggles
  tap: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    } catch {
      // ignore
    }
  },

  // Medium impact (20ms) - Bookmarking, highlighting scripture, saving note
  impact: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
    } catch {
      // ignore
    }
  },

  // Success pattern - Completing daily reflection, watering plant, marking task done
  success: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([10, 30, 15]);
      }
    } catch {
      // ignore
    }
  },

  // Warning / Alert pattern - Deleting, clearing cache, confirmation
  warning: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([25, 40, 25]);
      }
    } catch {
      // ignore
    }
  },
};
