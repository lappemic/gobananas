import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { buildPrompt, normalizeAspectRatio } from './prompt-builder.js';
import { ProgressTracker } from './progress-tracker.js';

const DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

/**
 * Main image generator class
 */
export class ImageGenerator {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY is required. Set it via environment variable or options.');
    }

    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    this.model = options.model || DEFAULT_MODEL;
    this.outputDir = options.outputDir || './output';
    this.imageSize = options.imageSize || '2K';
    this.progressTracker = new ProgressTracker(this.outputDir);
  }

  /**
   * Generates a single image
   * @param {Object} styleGuide - Style guide object
   * @param {Object} image - Image definition
   * @param {Array} referenceImages - Optional reference image paths
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Result with success status and file path
   */
  async generateImage(styleGuide, image, referenceImages = [], onProgress) {
    const prompt = buildPrompt(styleGuide, image);
    const aspectRatio = normalizeAspectRatio(image.aspect_ratio);

    // Build content parts
    const contentParts = [{ text: prompt }];

    // Add reference images if provided
    for (const refPath of referenceImages) {
      try {
        const imageData = fs.readFileSync(refPath);
        const base64 = imageData.toString('base64');
        const mimeType = this.getMimeType(refPath);
        contentParts.push({
          inlineData: { mimeType, data: base64 },
        });
      } catch (err) {
        console.warn(`Could not read reference image ${refPath}: ${err.message}`);
      }
    }

    let lastError;
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        if (attempt > 0) {
          onProgress?.(`Retry attempt ${attempt}/${RETRY_DELAYS.length}...`);
          await this.sleep(RETRY_DELAYS[attempt - 1]);
        }

        const response = await this.ai.models.generateContent({
          model: this.model,
          contents: contentParts,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio,
              imageSize: this.imageSize,
            },
          },
        });

        // Extract image from response
        const result = await this.processResponse(response, image);
        return result;
      } catch (err) {
        lastError = err;
        if (this.isRetryable(err) && attempt < RETRY_DELAYS.length) {
          continue;
        }
        break;
      }
    }

    throw lastError;
  }

  /**
   * Processes API response and saves image
   * @param {Object} response - API response
   * @param {Object} image - Image definition
   * @returns {Object} Result with file path
   */
  async processResponse(response, image) {
    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error('Invalid response structure from API');
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const filename = `${image.id}.png`;
        const filepath = path.join(this.outputDir, filename);

        fs.mkdirSync(this.outputDir, { recursive: true });
        fs.writeFileSync(filepath, Buffer.from(part.inlineData.data, 'base64'));

        return {
          success: true,
          filepath,
          imageId: image.id,
        };
      }
    }

    // Check for text-only response (might contain error or safety block)
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        throw new Error(`API returned text instead of image: ${part.text.substring(0, 200)}`);
      }
    }

    throw new Error('No image data in response');
  }

  /**
   * Batch generates all images
   * @param {Object} styleGuide - Style guide object
   * @param {Array} images - Array of image definitions
   * @param {Object} options - Generation options
   * @returns {Object} Results summary
   */
  async generateBatch(styleGuide, images, options = {}) {
    const { onProgress, onImageStart, getReferenceImages, freshStart } = options;

    if (freshStart) {
      this.progressTracker.clear();
    }

    const remaining = this.progressTracker.getRemaining(images);
    const results = {
      successful: [],
      failed: [],
      skipped: images.length - remaining.length,
    };

    onProgress?.(`Processing ${remaining.length} images (${results.skipped} already completed)`);

    for (let i = 0; i < remaining.length; i++) {
      const image = remaining[i];
      onImageStart?.(image, i + 1, remaining.length);

      try {
        // Get reference images interactively if callback provided
        let referenceImages = [];
        if (getReferenceImages) {
          referenceImages = await getReferenceImages(image);
        }

        const result = await this.generateImage(
          styleGuide,
          image,
          referenceImages,
          onProgress
        );

        this.progressTracker.markCompleted(image.id);
        results.successful.push(result);
        onProgress?.(`Completed: ${image.id}`);
      } catch (err) {
        this.progressTracker.markFailed(image.id, err.message);
        results.failed.push({
          imageId: image.id,
          error: err.message,
        });
        onProgress?.(`Failed: ${image.id} - ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Gets MIME type from file extension
   * @param {string} filepath - File path
   * @returns {string} MIME type
   */
  getMimeType(filepath) {
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/png';
  }

  /**
   * Checks if error is retryable
   * @param {Error} err - Error object
   * @returns {boolean}
   */
  isRetryable(err) {
    const message = err.message?.toLowerCase() || '';
    return (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('timeout') ||
      message.includes('temporarily')
    );
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets available models
   * @returns {Array} Model options
   */
  static getModels() {
    return [
      { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (Fast)', size: '1K' },
    ];
  }
}
