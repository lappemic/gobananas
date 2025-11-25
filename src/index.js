/**
 * gobanana - Programmatic API
 *
 * Usage:
 * ```js
 * import { ImageGenerator, buildPrompt, ProgressTracker } from 'gobanana';
 *
 * const generator = new ImageGenerator({
 *   apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
 *   outputDir: './output',
 *   imageSize: '2K'
 * });
 *
 * const results = await generator.generateBatch(styleGuide, images);
 * ```
 */

export { ImageGenerator } from './generator.js';
export { ProgressTracker } from './progress-tracker.js';
export {
  buildPrompt,
  formatStyleGuide,
  formatImageStyle,
  normalizeAspectRatio
} from './prompt-builder.js';
