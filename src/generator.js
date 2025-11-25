import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { buildPrompt, normalizeAspectRatio } from './prompt-builder.js';
import { ProgressTracker } from './progress-tracker.js';
import { ApiKeyError, parseApiError, GenerationError } from './errors.js';

/**
 * @typedef {import('./types.d.ts').StyleGuide} StyleGuide
 * @typedef {import('./types.d.ts').ImageDefinition} ImageDefinition
 * @typedef {import('./types.d.ts').GeneratorOptions} GeneratorOptions
 * @typedef {import('./types.d.ts').BatchOptions} BatchOptions
 * @typedef {import('./types.d.ts').GenerationResult} GenerationResult
 * @typedef {import('./types.d.ts').BatchResults} BatchResults
 */

const DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

/**
 * Main image generator class for batch AI image generation
 * @example
 * const generator = new ImageGenerator({ apiKey: 'your-key' });
 * const results = await generator.generateBatch(styleGuide, images);
 */
export class ImageGenerator {
  /**
   * Creates a new ImageGenerator instance
   * @param {GeneratorOptions} options - Generator configuration
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!this.apiKey) {
      throw new ApiKeyError();
    }

    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    this.model = options.model || DEFAULT_MODEL;
    this.outputDir = options.outputDir || './output';
    this.imageSize = options.imageSize || '2K';
    this.outputFormat = options.outputFormat || 'png';
    this.filenameTemplate = options.filenameTemplate || '{id}';
    this.progressTracker = new ProgressTracker(this.outputDir);
  }

  /**
   * Generates filename from template
   * @param {ImageDefinition} image - Image definition
   * @returns {string} Generated filename with extension
   */
  generateFilename(image) {
    const ext = this.outputFormat === 'jpg' ? 'jpg' : this.outputFormat;
    const filename = this.filenameTemplate
      .replace('{id}', image.id)
      .replace('{section}', image.section || 'default')
      .replace('{title}', (image.title || image.id).replace(/[^a-zA-Z0-9-_]/g, '_'))
      .replace('{ratio}', (image.aspect_ratio || '16:9').replace(':', 'x'));
    return `${filename}.${ext}`;
  }

  /**
   * Generates a single image from style guide and image definition
   * @param {StyleGuide} styleGuide - Style guide with brand configuration
   * @param {ImageDefinition} image - Image definition with prompt and settings
   * @param {string[]} [referenceImages=[]] - Optional paths to reference images (up to 14)
   * @param {(message: string) => void} [onProgress] - Progress callback for status updates
   * @returns {Promise<GenerationResult>} Result with success status and file path
   * @throws {Error} When API call fails after retries
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
        lastError = parseApiError(err, image.id);
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
      throw new GenerationError(
        'Invalid response structure from API. The model may not support image generation.',
        image.id
      );
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const filename = this.generateFilename(image);
        const filepath = path.join(this.outputDir, filename);

        fs.mkdirSync(this.outputDir, { recursive: true });
        fs.writeFileSync(filepath, Buffer.from(part.inlineData.data, 'base64'));

        return {
          success: true,
          filepath,
          imageId: image.id,
          filename,
        };
      }
    }

    // Check for text-only response (might contain error or safety block)
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        const text = part.text.substring(0, 200);
        // Check for common safety-related messages
        if (text.toLowerCase().includes('cannot') || text.toLowerCase().includes('sorry')) {
          throw new GenerationError(
            `Content blocked: ${text}. Try simplifying your prompt or removing specific brand references.`,
            image.id
          );
        }
        throw new GenerationError(`API returned text instead of image: ${text}`, image.id);
      }
    }

    throw new GenerationError('No image data in response. The prompt may be too complex.', image.id);
  }

  /**
   * Batch generates all images in parallel with configurable concurrency
   * @param {StyleGuide} styleGuide - Style guide with brand configuration
   * @param {ImageDefinition[]} images - Array of image definitions to generate
   * @param {BatchOptions} [options={}] - Batch generation options
   * @returns {Promise<BatchResults>} Results summary with successful/failed counts
   * @example
   * const results = await generator.generateBatch(styleGuide, images, {
   *   concurrency: 5,
   *   onProgress: (msg) => console.log(msg)
   * });
   */
  async generateBatch(styleGuide, images, options = {}) {
    const {
      onProgress,
      onImageStart,
      getReferenceImages,
      freshStart,
      concurrency = 5
    } = options;

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

    // Collect reference images upfront if interactive mode
    const imageRefMap = new Map();
    if (getReferenceImages) {
      onProgress?.('Collecting reference images for all pending images...');
      for (let i = 0; i < remaining.length; i++) {
        const image = remaining[i];
        onImageStart?.(image, i + 1, remaining.length);
        const refs = await getReferenceImages(image);
        imageRefMap.set(image.id, refs);
      }
      onProgress?.('Reference images collected. Starting parallel generation...');
    }

    // Process in batches with concurrency limit
    const chunks = this.chunkArray(remaining, concurrency);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkStart = chunkIndex * concurrency;

      onProgress?.(`Processing batch ${chunkIndex + 1}/${chunks.length} (${chunk.length} images)...`);

      const promises = chunk.map(async (image, i) => {
        const globalIndex = chunkStart + i + 1;
        onImageStart?.(image, globalIndex, remaining.length);

        try {
          const referenceImages = imageRefMap.get(image.id) || [];
          const result = await this.generateImage(
            styleGuide,
            image,
            referenceImages,
            (msg) => onProgress?.(`[${image.id}] ${msg}`)
          );

          this.progressTracker.markCompleted(image.id);
          onProgress?.(`Completed: ${image.id}`);
          return { success: true, result };
        } catch (err) {
          this.progressTracker.markFailed(image.id, err.message);
          onProgress?.(`Failed: ${image.id} - ${err.message}`);
          return { success: false, imageId: image.id, error: err.message };
        }
      });

      const chunkResults = await Promise.all(promises);

      for (const res of chunkResults) {
        if (res.success) {
          results.successful.push(res.result);
        } else {
          results.failed.push({ imageId: res.imageId, error: res.error });
        }
      }
    }

    return results;
  }

  /**
   * Splits array into chunks
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
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
