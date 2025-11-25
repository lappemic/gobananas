/**
 * Custom error classes and error handling utilities for gobanana
 */

const DOCS_URL = 'https://github.com/anthropics/gobanana#readme';
const API_KEY_URL = 'https://aistudio.google.com/app/apikey';

/**
 * Base error class for gobanana
 */
export class GobananaError extends Error {
  constructor(message, { code, hint, docsSection } = {}) {
    super(message);
    this.name = 'GobananaError';
    this.code = code;
    this.hint = hint;
    this.docsSection = docsSection;
  }

  toString() {
    let msg = `${this.name}: ${this.message}`;
    if (this.hint) {
      msg += `\n\nHint: ${this.hint}`;
    }
    if (this.docsSection) {
      msg += `\n\nDocs: ${DOCS_URL}#${this.docsSection}`;
    }
    return msg;
  }
}

/**
 * Error for missing or invalid API key
 */
export class ApiKeyError extends GobananaError {
  constructor(message) {
    super(message || 'API key is missing or invalid', {
      code: 'API_KEY_ERROR',
      hint: `Set GOOGLE_AI_STUDIO_API_KEY environment variable or pass apiKey option.\nGet your key at: ${API_KEY_URL}`,
      docsSection: 'quick-start'
    });
    this.name = 'ApiKeyError';
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends GobananaError {
  constructor(message) {
    super(message || 'API rate limit exceeded', {
      code: 'RATE_LIMIT',
      hint: 'Reduce concurrency with -c flag or wait before retrying.\nExample: gobanana generate -s style.json -i images.json -c 2',
      docsSection: 'options'
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Error for invalid configuration
 */
export class ConfigError extends GobananaError {
  constructor(message, field) {
    super(message, {
      code: 'CONFIG_ERROR',
      hint: field ? `Check the "${field}" field in your configuration file` : 'Verify your JSON configuration files are valid',
      docsSection: 'style-guide-reference'
    });
    this.name = 'ConfigError';
  }
}

/**
 * Error for image generation failures
 */
export class GenerationError extends GobananaError {
  constructor(message, imageId) {
    super(message, {
      code: 'GENERATION_ERROR',
      hint: imageId
        ? `Failed to generate image "${imageId}". Check your prompt or try with different settings.`
        : 'Image generation failed. Try adjusting the prompt or reducing complexity.',
      docsSection: 'image-definition-reference'
    });
    this.name = 'GenerationError';
    this.imageId = imageId;
  }
}

/**
 * Parses API errors and returns user-friendly error objects
 * @param {Error} err - Original error from API
 * @param {string} [imageId] - Optional image ID for context
 * @returns {StylegenError} User-friendly error
 */
export function parseApiError(err, imageId) {
  const message = err.message?.toLowerCase() || '';

  // API key errors
  if (message.includes('api key') || message.includes('401') || message.includes('unauthorized')) {
    return new ApiKeyError('Invalid or expired API key');
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('429') || message.includes('quota')) {
    return new RateLimitError('API rate limit exceeded. The request will be retried automatically.');
  }

  // Safety/content filtering
  if (message.includes('safety') || message.includes('blocked') || message.includes('harmful')) {
    return new GenerationError(
      'Content was blocked by safety filters. Try adjusting your prompt to be less specific or remove potentially problematic content.',
      imageId
    );
  }

  // Invalid request
  if (message.includes('invalid') || message.includes('400')) {
    return new ConfigError(`Invalid request: ${err.message}`);
  }

  // Server errors
  if (message.includes('503') || message.includes('500') || message.includes('server')) {
    return new GobananaError('Google API server error. This is temporary - please retry.', {
      code: 'SERVER_ERROR',
      hint: 'The API is temporarily unavailable. Your progress is saved and you can resume later.'
    });
  }

  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return new GobananaError('Request timed out', {
      code: 'TIMEOUT',
      hint: 'The request took too long. Try reducing image complexity or concurrency.'
    });
  }

  // Generic fallback
  return new GenerationError(err.message || 'Unknown error occurred', imageId);
}

/**
 * Formats error for CLI output
 * @param {Error} err - Error to format
 * @returns {string} Formatted error message
 */
export function formatErrorForCli(err) {
  if (err instanceof GobananaError) {
    return err.toString();
  }
  return `Error: ${err.message}`;
}
