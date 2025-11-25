/**
 * Builds comprehensive prompts by combining style guides with image definitions
 */

/**
 * Formats the style guide into a concise prompt section
 * @param {Object} styleGuide - The style guide object
 * @returns {string} Formatted style guide text
 */
export function formatStyleGuide(styleGuide) {
  const sg = styleGuide.style_guide || styleGuide;

  const sections = [];

  // Brand keywords
  if (sg.brand_keywords?.length) {
    sections.push(`Style Keywords: ${sg.brand_keywords.join(', ')}`);
  }

  // Color palette
  if (sg.palette) {
    const palette = sg.palette;
    const colors = [];
    if (palette.background?.length) {
      colors.push(`Background: ${palette.background.join(', ')}`);
    }
    if (palette.primary_accents?.length) {
      colors.push(`Primary accents: ${palette.primary_accents.join(', ')}`);
    }
    if (palette.secondary_accents?.length) {
      colors.push(`Secondary accents: ${palette.secondary_accents.join(', ')}`);
    }
    if (palette.neutrals?.length) {
      colors.push(`Neutrals: ${palette.neutrals.join(', ')}`);
    }
    if (colors.length) {
      sections.push(`Color Palette:\n${colors.join('\n')}`);
    }
  }

  // UI style
  if (sg.ui_style) {
    const ui = sg.ui_style;
    const uiParts = [];
    if (ui.mode) uiParts.push(`Mode: ${ui.mode}`);
    if (ui.shapes) uiParts.push(`Shapes: ${ui.shapes}`);
    if (ui.charts) uiParts.push(`Charts: ${ui.charts}`);
    if (ui.icons) uiParts.push(`Icons: ${ui.icons}`);
    if (uiParts.length) {
      sections.push(`UI Style:\n${uiParts.join('\n')}`);
    }
  }

  // Typography
  if (sg.typography_feel?.length) {
    sections.push(`Typography: ${sg.typography_feel.join(', ')}`);
  }

  // Visual motifs
  if (sg.visual_motifs?.length) {
    sections.push(`Visual Motifs: ${sg.visual_motifs.join('; ')}`);
  }

  // Things to avoid
  if (sg.avoid?.length) {
    sections.push(`AVOID: ${sg.avoid.join('; ')}`);
  }

  return sections.join('\n\n');
}

/**
 * Formats the image-specific style attributes
 * @param {Object} imageStyle - The style object from an image definition
 * @returns {string} Formatted style text
 */
export function formatImageStyle(imageStyle) {
  if (!imageStyle) return '';

  const parts = [];
  if (imageStyle.lighting) parts.push(`Lighting: ${imageStyle.lighting}`);
  if (imageStyle.detail_level) parts.push(`Detail level: ${imageStyle.detail_level}`);
  if (imageStyle.ui_fidelity) parts.push(`UI fidelity: ${imageStyle.ui_fidelity}`);
  if (imageStyle.mood) parts.push(`Mood: ${imageStyle.mood}`);

  return parts.length ? parts.join('. ') + '.' : '';
}

/**
 * Builds the complete prompt for an image
 * @param {Object} styleGuide - The style guide object
 * @param {Object} image - The image definition
 * @returns {string} Complete prompt text
 */
export function buildPrompt(styleGuide, image) {
  const styleGuideText = formatStyleGuide(styleGuide);
  const imageStyleText = formatImageStyle(image.style);

  const promptParts = [
    '=== STYLE GUIDE ===',
    styleGuideText,
    '',
    '=== IMAGE REQUEST ===',
    `Title: ${image.title}`,
    `Section: ${image.section}`,
    `Aspect Ratio: ${image.aspect_ratio}`,
    '',
    '=== MAIN PROMPT ===',
    image.prompt,
  ];

  if (imageStyleText) {
    promptParts.push('', '=== IMAGE-SPECIFIC STYLE ===', imageStyleText);
  }

  return promptParts.join('\n');
}

/**
 * Normalizes aspect ratio string to API-compatible format
 * @param {string} aspectRatio - Aspect ratio like "16:9" or "4:3"
 * @returns {string} Normalized aspect ratio
 */
export function normalizeAspectRatio(aspectRatio) {
  const supported = ['1:1', '16:9', '21:9', '4:5', '5:4', '2:3', '3:2', '3:4', '4:3', '9:16'];
  const normalized = aspectRatio.replace(/\s/g, '');

  if (supported.includes(normalized)) {
    return normalized;
  }

  // Default to 16:9 if unsupported
  console.warn(`Aspect ratio "${aspectRatio}" not supported, defaulting to 16:9`);
  return '16:9';
}
