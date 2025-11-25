# stylegen

[![npm version](https://img.shields.io/npm/v/stylegen.svg)](https://www.npmjs.com/package/stylegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Batch generate AI images with consistent style using Google's Gemini API (nano banana pro). Define a style guide once, generate hundreds of on-brand images.

## Why stylegen?

- **Style consistency** - Define colors, typography, mood once. Every image follows your brand.
- **Batch processing** - Generate 10 or 100 images with one command
- **Parallel requests** - Configurable concurrency for fast generation
- **Reference images** - Use up to 14 reference images per generation
- **Resume support** - Interrupted? Pick up where you left off

## Quick Start

```bash
# Install
npm install -g stylegen

# Set your API key
export GOOGLE_AI_STUDIO_API_KEY=your_key_here

# Generate images
stylegen generate -s style-guide.json -i images.json
```

Get your API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

## How It Works

**1. Define your style guide** (`style-guide.json`):

```json
{
  "style_guide": {
    "brand_keywords": ["modern", "minimal", "tech"],
    "palette": {
      "background": ["#0a0a0a", "#1a1a1a"],
      "primary_accents": ["#3b82f6", "#8b5cf6"],
      "neutrals": ["#ffffff", "#a1a1aa"]
    },
    "ui_style": {
      "mode": "dark",
      "shapes": "rounded corners, soft shadows"
    },
    "avoid": ["stock photos", "cluttered layouts"]
  }
}
```

**2. Define your images** (`images.json`):

```json
{
  "images": [
    {
      "id": "hero_dashboard",
      "section": "hero",
      "title": "Dashboard Hero Image",
      "aspect_ratio": "16:9",
      "prompt": "A modern SaaS dashboard with analytics charts...",
      "style": {
        "lighting": "soft ambient",
        "mood": "professional, calm"
      }
    }
  ]
}
```

**3. Generate**:

```bash
stylegen generate -s style-guide.json -i images.json
```

The CLI merges your style guide with each image prompt, ensuring consistent branding across all outputs.

## CLI Commands

```bash
# Generate images (interactive mode - prompts for reference images)
stylegen generate -s style-guide.json -i images.json

# Generate without reference image prompts
stylegen generate -s style-guide.json -i images.json --no-interactive

# Custom output directory
stylegen generate -s style-guide.json -i images.json -o ./my-images

# Adjust parallelism (default: 5)
stylegen generate -s style-guide.json -i images.json -c 10

# List images in config
stylegen list -i images.json

# Check generation progress
stylegen status

# Clear progress (start fresh)
stylegen clear
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --style-guide <path>` | Path to style guide JSON | Required |
| `-i, --images <path>` | Path to images JSON | Required |
| `-o, --output <path>` | Output directory | `./output` |
| `-c, --concurrency <n>` | Parallel requests | `5` |
| `-k, --api-key <key>` | API key (or use env var) | - |
| `-m, --model <model>` | Gemini model | `gemini-2.0-flash-preview-image-generation` |
| `--size <size>` | Image size: 1K, 2K, 4K | `2K` |
| `--no-interactive` | Skip reference image prompts | `false` |

## Programmatic Usage

```javascript
import { ImageGenerator } from 'stylegen';

const generator = new ImageGenerator({
  apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
  outputDir: './output',
  imageSize: '2K'
});

const styleGuide = { /* your style guide */ };
const images = [{ /* your images */ }];

const results = await generator.generateBatch(styleGuide, images, {
  concurrency: 5,
  onProgress: (msg) => console.log(msg)
});

console.log(`Generated ${results.successful.length} images`);
```

## Style Guide Reference

| Field | Description |
|-------|-------------|
| `brand_keywords` | Array of style keywords (e.g., "minimal", "bold") |
| `palette.background` | Background colors (hex) |
| `palette.primary_accents` | Primary accent colors |
| `palette.secondary_accents` | Secondary accent colors |
| `palette.neutrals` | Neutral/text colors |
| `ui_style.mode` | Light/dark mode preference |
| `ui_style.shapes` | Shape descriptions |
| `ui_style.charts` | Chart style preferences |
| `ui_style.icons` | Icon style preferences |
| `typography_feel` | Typography descriptions |
| `visual_motifs` | Recurring visual elements |
| `avoid` | Things to explicitly avoid |

## Image Definition Reference

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (used for filename) |
| `section` | Logical grouping |
| `title` | Human-readable title |
| `aspect_ratio` | Ratio: 1:1, 16:9, 4:3, 9:16, etc. |
| `prompt` | Main image generation prompt |
| `style.lighting` | Lighting description |
| `style.detail_level` | low, medium, high |
| `style.ui_fidelity` | For UI mockups |
| `style.mood` | Emotional tone |

## Supported Aspect Ratios

`1:1`, `16:9`, `21:9`, `4:5`, `5:4`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`

## Resume & Progress

stylegen automatically tracks progress. If generation is interrupted:

```bash
# Resume from where you left off
stylegen generate -s style-guide.json -i images.json

# Or start fresh
stylegen clear
stylegen generate -s style-guide.json -i images.json
```

Progress is stored in `./output/.progress.json`.

## License

MIT
