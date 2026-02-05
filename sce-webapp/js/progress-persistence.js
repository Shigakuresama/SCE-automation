/**
 * Progress Persistence Module
 * Save and resume SCE automation progress
 */

import { Storage } from './storage.js';

const PROGRESS_KEY = 'routeplanner_progress';

export class ProgressPersistence {
  constructor() {
    this.currentProgress = null;
  }

  /**
   * Save current progress
   * @param {Object} data - Progress data to save
   */
  save(data) {
    const progress = {
      blockId: data.blockId,
      completed: data.completed,
      remaining: data.remaining,
      timestamp: Date.now(),
      version: '1.0'
    };

    Storage.set(PROGRESS_KEY, progress);
    this.currentProgress = progress;
  }

  /**
   * Load saved progress
   * @returns {Object|null} Saved progress or null
   */
  load() {
    const saved = Storage.get(PROGRESS_KEY);

    if (!saved) {
      return null;
    }

    // Check if progress is recent (within 24 hours)
    const age = Date.now() - saved.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      this.clear();
      return null;
    }

    this.currentProgress = saved;
    return saved;
  }

  /**
   * Check if progress exists for a block
   * @param {string} blockId - Block ID to check
   * @returns {boolean}
   */
  hasProgress(blockId) {
    const saved = this.load();
    return saved && saved.blockId === blockId && saved.remaining.length > 0;
  }

  /**
   * Get progress for a specific block
   * @param {string} blockId - Block ID
   * @returns {Object|null}
   */
  getProgress(blockId) {
    const saved = this.load();

    if (saved && saved.blockId === blockId) {
      return {
        completed: saved.completed,
        remaining: saved.remaining,
        total: saved.completed.length + saved.remaining.length,
        timestamp: new Date(saved.timestamp)
      };
    }

    return null;
  }

  /**
   * Clear saved progress
   */
  clear() {
    Storage.remove(PROGRESS_KEY);
    this.currentProgress = null;
  }

  /**
   * Get summary for UI display
   * @param {string} blockId - Block ID
   * @returns {Object|null}
   */
  getSummary(blockId) {
    const progress = this.getProgress(blockId);

    if (!progress) {
      return null;
    }

    return {
      completed: progress.completed.length,
      remaining: progress.remaining.length,
      total: progress.total,
      percentComplete: Math.round((progress.completed.length / progress.total) * 100),
      timeElapsed: this._formatTime(progress.timestamp)
    };
  }

  /**
   * Format timestamp for display
   * @private
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

export default ProgressPersistence;
