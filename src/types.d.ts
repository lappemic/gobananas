/**
 * Style guide palette configuration
 */
export interface Palette {
  background?: string[];
  primary_accents?: string[];
  secondary_accents?: string[];
  neutrals?: string[];
}

/**
 * UI style configuration
 */
export interface UIStyle {
  mode?: string;
  shapes?: string;
  charts?: string;
  icons?: string;
}

/**
 * Style guide definition
 */
export interface StyleGuideDefinition {
  brand_keywords?: string[];
  palette?: Palette;
  ui_style?: UIStyle;
  typography_feel?: string[];
  visual_motifs?: string[];
  avoid?: string[];
}

/**
 * Style guide wrapper object
 */
export interface StyleGuide {
  style_guide?: StyleGuideDefinition;
}

/**
 * Image-specific style attributes
 */
export interface ImageStyle {
  lighting?: string;
  detail_level?: 'low' | 'medium' | 'medium-high' | 'high';
  ui_fidelity?: string;
  mood?: string;
}

/**
 * Supported aspect ratios
 */
export type AspectRatio = '1:1' | '16:9' | '21:9' | '4:5' | '5:4' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16';

/**
 * Image definition for generation
 */
export interface ImageDefinition {
  id: string;
  section?: string;
  title: string;
  aspect_ratio: AspectRatio | string;
  prompt: string;
  style?: ImageStyle;
}

/**
 * Image generator options
 */
export interface GeneratorOptions {
  apiKey?: string;
  model?: string;
  outputDir?: string;
  imageSize?: '1K' | '2K' | '4K';
}

/**
 * Batch generation options
 */
export interface BatchOptions {
  freshStart?: boolean;
  concurrency?: number;
  onProgress?: (message: string) => void;
  onImageStart?: (image: ImageDefinition, current: number, total: number) => void;
  getReferenceImages?: (image: ImageDefinition) => Promise<string[]>;
}

/**
 * Generation result for a single image
 */
export interface GenerationResult {
  success: boolean;
  filepath: string;
  imageId: string;
}

/**
 * Batch generation results summary
 */
export interface BatchResults {
  successful: GenerationResult[];
  failed: Array<{ imageId: string; error: string }>;
  skipped: number;
}

/**
 * Progress tracker statistics
 */
export interface ProgressStats {
  completed: number;
  failed: number;
  startedAt: string;
}

/**
 * Main image generator class
 */
export declare class ImageGenerator {
  constructor(options?: GeneratorOptions);

  generateImage(
    styleGuide: StyleGuide | StyleGuideDefinition,
    image: ImageDefinition,
    referenceImages?: string[],
    onProgress?: (message: string) => void
  ): Promise<GenerationResult>;

  generateBatch(
    styleGuide: StyleGuide | StyleGuideDefinition,
    images: ImageDefinition[],
    options?: BatchOptions
  ): Promise<BatchResults>;

  static getModels(): Array<{ id: string; name: string; size: string }>;
}

/**
 * Progress tracker for resumable generation
 */
export declare class ProgressTracker {
  constructor(outputDir: string);

  load(): void;
  save(): void;
  isCompleted(imageId: string): boolean;
  markCompleted(imageId: string): void;
  markFailed(imageId: string, error: string): void;
  getFailedAttempts(imageId: string): number;
  getRemaining(allImages: ImageDefinition[], maxRetries?: number): ImageDefinition[];
  getStats(): ProgressStats;
  clear(): void;
}

/**
 * Build a complete prompt from style guide and image definition
 */
export declare function buildPrompt(
  styleGuide: StyleGuide | StyleGuideDefinition,
  image: ImageDefinition
): string;

/**
 * Format style guide into prompt text
 */
export declare function formatStyleGuide(
  styleGuide: StyleGuide | StyleGuideDefinition
): string;

/**
 * Format image-specific style into prompt text
 */
export declare function formatImageStyle(imageStyle?: ImageStyle): string;

/**
 * Normalize aspect ratio to supported format
 */
export declare function normalizeAspectRatio(aspectRatio: string): AspectRatio;
