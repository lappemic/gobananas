import fs from 'node:fs';
import path from 'node:path';

/**
 * Tracks generation progress to enable resume after interruption
 */
export class ProgressTracker {
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.progressFile = path.join(outputDir, '.progress.json');
    this.progress = this.load();
  }

  /**
   * Loads existing progress from file
   * @returns {Object} Progress state
   */
  load() {
    try {
      if (fs.existsSync(this.progressFile)) {
        const data = fs.readFileSync(this.progressFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('Could not load progress file, starting fresh');
    }
    return {
      completed: [],
      failed: [],
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * Saves current progress to file
   */
  save() {
    try {
      fs.mkdirSync(this.outputDir, { recursive: true });
      fs.writeFileSync(
        this.progressFile,
        JSON.stringify(this.progress, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Failed to save progress:', err.message);
    }
  }

  /**
   * Checks if an image has already been completed
   * @param {string} imageId - Image identifier
   * @returns {boolean}
   */
  isCompleted(imageId) {
    return this.progress.completed.includes(imageId);
  }

  /**
   * Marks an image as completed
   * @param {string} imageId - Image identifier
   */
  markCompleted(imageId) {
    if (!this.progress.completed.includes(imageId)) {
      this.progress.completed.push(imageId);
      this.save();
    }
  }

  /**
   * Records a failed attempt
   * @param {string} imageId - Image identifier
   * @param {string} error - Error message
   */
  markFailed(imageId, error) {
    const existing = this.progress.failed.find((f) => f.id === imageId);
    if (existing) {
      existing.attempts++;
      existing.lastError = error;
      existing.lastAttempt = new Date().toISOString();
    } else {
      this.progress.failed.push({
        id: imageId,
        attempts: 1,
        lastError: error,
        lastAttempt: new Date().toISOString(),
      });
    }
    this.save();
  }

  /**
   * Gets the number of failed attempts for an image
   * @param {string} imageId - Image identifier
   * @returns {number}
   */
  getFailedAttempts(imageId) {
    const record = this.progress.failed.find((f) => f.id === imageId);
    return record?.attempts || 0;
  }

  /**
   * Gets images that still need processing
   * @param {Array} allImages - All image definitions
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Array} Remaining images to process
   */
  getRemaining(allImages, maxRetries = 3) {
    return allImages.filter((img) => {
      if (this.isCompleted(img.id)) return false;
      if (this.getFailedAttempts(img.id) >= maxRetries) return false;
      return true;
    });
  }

  /**
   * Gets summary statistics
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      completed: this.progress.completed.length,
      failed: this.progress.failed.length,
      startedAt: this.progress.startedAt,
    };
  }

  /**
   * Clears all progress (fresh start)
   */
  clear() {
    this.progress = {
      completed: [],
      failed: [],
      startedAt: new Date().toISOString(),
    };
    if (fs.existsSync(this.progressFile)) {
      fs.unlinkSync(this.progressFile);
    }
  }
}
