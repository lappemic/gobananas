import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatStyleGuide,
  formatImageStyle,
  buildPrompt,
  normalizeAspectRatio
} from '../src/prompt-builder.js';

describe('formatStyleGuide', () => {
  it('should format brand keywords', () => {
    const styleGuide = {
      style_guide: {
        brand_keywords: ['modern', 'minimal', 'tech']
      }
    };
    const result = formatStyleGuide(styleGuide);
    assert.ok(result.includes('Style Keywords: modern, minimal, tech'));
  });

  it('should format color palette', () => {
    const styleGuide = {
      style_guide: {
        palette: {
          background: ['#000000', '#111111'],
          primary_accents: ['#0066FF'],
          neutrals: ['#FFFFFF']
        }
      }
    };
    const result = formatStyleGuide(styleGuide);
    assert.ok(result.includes('Background: #000000, #111111'));
    assert.ok(result.includes('Primary accents: #0066FF'));
    assert.ok(result.includes('Neutrals: #FFFFFF'));
  });

  it('should format UI style', () => {
    const styleGuide = {
      style_guide: {
        ui_style: {
          mode: 'dark',
          shapes: 'rounded corners',
          icons: 'thin line'
        }
      }
    };
    const result = formatStyleGuide(styleGuide);
    assert.ok(result.includes('Mode: dark'));
    assert.ok(result.includes('Shapes: rounded corners'));
    assert.ok(result.includes('Icons: thin line'));
  });

  it('should format avoid list', () => {
    const styleGuide = {
      style_guide: {
        avoid: ['stock photos', 'cluttered layouts']
      }
    };
    const result = formatStyleGuide(styleGuide);
    assert.ok(result.includes('AVOID: stock photos; cluttered layouts'));
  });

  it('should handle style_guide wrapper or direct object', () => {
    const direct = {
      brand_keywords: ['test']
    };
    const wrapped = {
      style_guide: {
        brand_keywords: ['test']
      }
    };
    const resultDirect = formatStyleGuide(direct);
    const resultWrapped = formatStyleGuide(wrapped);
    assert.strictEqual(resultDirect, resultWrapped);
  });

  it('should handle empty style guide', () => {
    const result = formatStyleGuide({});
    assert.strictEqual(result, '');
  });
});

describe('formatImageStyle', () => {
  it('should format all style attributes', () => {
    const style = {
      lighting: 'soft ambient',
      detail_level: 'high',
      ui_fidelity: 'realistic',
      mood: 'professional'
    };
    const result = formatImageStyle(style);
    assert.ok(result.includes('Lighting: soft ambient'));
    assert.ok(result.includes('Detail level: high'));
    assert.ok(result.includes('UI fidelity: realistic'));
    assert.ok(result.includes('Mood: professional'));
  });

  it('should handle partial style', () => {
    const style = {
      lighting: 'dramatic',
      mood: 'energetic'
    };
    const result = formatImageStyle(style);
    assert.ok(result.includes('Lighting: dramatic'));
    assert.ok(result.includes('Mood: energetic'));
    assert.ok(!result.includes('Detail level'));
  });

  it('should return empty string for undefined', () => {
    const result = formatImageStyle(undefined);
    assert.strictEqual(result, '');
  });

  it('should return empty string for empty object', () => {
    const result = formatImageStyle({});
    assert.strictEqual(result, '');
  });
});

describe('buildPrompt', () => {
  it('should combine style guide and image definition', () => {
    const styleGuide = {
      style_guide: {
        brand_keywords: ['modern'],
        palette: { background: ['#000'] }
      }
    };
    const image = {
      id: 'test_image',
      title: 'Test Image',
      section: 'hero',
      aspect_ratio: '16:9',
      prompt: 'A beautiful landscape',
      style: { lighting: 'natural' }
    };

    const result = buildPrompt(styleGuide, image);

    assert.ok(result.includes('=== STYLE GUIDE ==='));
    assert.ok(result.includes('Style Keywords: modern'));
    assert.ok(result.includes('=== IMAGE REQUEST ==='));
    assert.ok(result.includes('Title: Test Image'));
    assert.ok(result.includes('Section: hero'));
    assert.ok(result.includes('Aspect Ratio: 16:9'));
    assert.ok(result.includes('=== MAIN PROMPT ==='));
    assert.ok(result.includes('A beautiful landscape'));
    assert.ok(result.includes('=== IMAGE-SPECIFIC STYLE ==='));
    assert.ok(result.includes('Lighting: natural'));
  });

  it('should work without image style', () => {
    const styleGuide = { style_guide: { brand_keywords: ['test'] } };
    const image = {
      id: 'test',
      title: 'Test',
      section: 'test',
      aspect_ratio: '1:1',
      prompt: 'Test prompt'
    };

    const result = buildPrompt(styleGuide, image);
    assert.ok(!result.includes('=== IMAGE-SPECIFIC STYLE ==='));
  });
});

describe('normalizeAspectRatio', () => {
  it('should return supported aspect ratios as-is', () => {
    const supported = ['1:1', '16:9', '4:3', '9:16', '21:9'];
    for (const ratio of supported) {
      assert.strictEqual(normalizeAspectRatio(ratio), ratio);
    }
  });

  it('should strip whitespace', () => {
    assert.strictEqual(normalizeAspectRatio(' 16:9 '), '16:9');
    assert.strictEqual(normalizeAspectRatio('16 : 9'), '16:9');
  });

  it('should default unsupported ratios to 16:9', () => {
    assert.strictEqual(normalizeAspectRatio('7:5'), '16:9');
    assert.strictEqual(normalizeAspectRatio('invalid'), '16:9');
  });
});
