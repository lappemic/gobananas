# gobanana

[![npm version](https://img.shields.io/npm/v/gobanana.svg)](https://www.npmjs.com/package/gobanana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Batch generate AI images with consistent style using Google's Gemini API. Define a style guide once, generate hundreds of on-brand images.

## Why gobanana?

- **Style consistency** - Define colors, geometry, depth, typography once. Every image follows your brand.
- **Batch processing** - Generate 10 or 100 images with one command
- **Parallel requests** - Configurable concurrency for fast generation
- **Reference images** - Use up to 14 reference images per generation
- **Resume support** - Interrupted? Pick up where you left off
- **Dry-run mode** - Preview prompts and estimate costs before generating

## Quick Start

```bash
# Install
npm install -g gobanana

# Set your API key
export GOOGLE_AI_STUDIO_API_KEY=your_key_here

# Generate images
gobanana generate -s style-guide.json -i images.json
```

Get your API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

## How It Works

**1. Define your style guide** (`style-guide.json`):

```json
{
  "style_guide": {
    "brand_essence": {
      "keywords": ["precision", "clarity", "premium"],
      "personality": "A sophisticated platform that feels powerful yet approachable",
      "visual_metaphor": "Light emerging from structured darkness"
    },
    "color_system": {
      "backgrounds": {
        "deep": "#050816",
        "medium": "#0A0F1E",
        "gradient_direction": "135deg"
      },
      "accents": {
        "primary": "#6366F1",
        "secondary": "#22D3EE",
        "tertiary": "#A855F7"
      },
      "usage_rules": ["Primary for focal points", "Max 2 accents per image"]
    },
    "geometry": {
      "corner_radius": {
        "small": "8px",
        "medium": "12px",
        "large": "16px"
      },
      "shapes": "Rounded rectangles only, no sharp corners"
    },
    "depth_system": {
      "glow_primary": "0 0 20px rgba(99,102,241,0.4)",
      "shadows": "Soft, falling down-right"
    },
    "line_system": {
      "weights": { "light": "1.5px", "medium": "2px" },
      "connection_style": "Smooth bezier curves"
    },
    "consistency_rules": [
      "ALL images share same gradient direction",
      "ALL glows use 20px blur",
      "ALL shadows fall down-right"
    ],
    "avoid": ["photographs", "human faces", "logos", "pure black"]
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
      "prompt": "A premium SaaS dashboard on a deep blue-black gradient background (#050816 to #0A0F1E, 135-degree angle). Main card with 16px corner radius, indigo accent (#6366F1) with soft glow...",
      "style": {
        "lighting": "Top-left soft key light, indigo glow on focal elements",
        "detail_level": "high",
        "ui_fidelity": "Production-quality UI mockup",
        "mood": "Confident, premium, intelligent",
        "color_temperature": "Cool, blue-dominant",
        "focal_point": "Main dashboard card, slightly left of center"
      }
    }
  ]
}
```

**3. Generate**:

```bash
gobanana generate -s style-guide.json -i images.json
```

## CLI Commands

```bash
# Generate images
gobanana generate -s style-guide.json -i images.json

# Preview prompts without API calls (includes cost estimate)
gobanana dry-run -s style-guide.json -i images.json
gobanana dry-run -s style-guide.json -i images.json --full  # Show full prompts

# Custom output directory and format
gobanana generate -s style-guide.json -i images.json -o ./my-images -f webp

# Custom filename template
gobanana generate -s style-guide.json -i images.json --filename "{section}_{id}"

# Adjust parallelism (default: 5)
gobanana generate -s style-guide.json -i images.json -c 10

# Initialize config file
gobanana init

# List images in config
gobanana list -i images.json

# Check generation progress
gobanana status

# Clear progress (start fresh)
gobanana clear
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --style-guide <path>` | Path to style guide JSON | Required |
| `-i, --images <path>` | Path to images JSON | Required |
| `-o, --output <path>` | Output directory | `./output` |
| `-c, --concurrency <n>` | Parallel requests | `5` |
| `-f, --format <format>` | Output format: png, jpg, webp | `png` |
| `--filename <template>` | Filename template | `{id}` |
| `-k, --api-key <key>` | API key (or use env var) | - |
| `-m, --model <model>` | Gemini model | `gemini-2.0-flash-preview-image-generation` |
| `--size <size>` | Image size: 1K, 2K, 4K | `2K` |
| `--interactive` | Prompt for reference images | `false` |

### Filename Templates

Use placeholders in `--filename`:
- `{id}` - Image ID
- `{section}` - Section name
- `{title}` - Image title (sanitized)
- `{ratio}` - Aspect ratio (e.g., `16x9`)

Example: `--filename "{section}_{id}"` → `hero_dashboard.png`

## Config File

Create a `.gobananarc.json` in your project root:

```json
{
  "styleGuide": "./style-guide.json",
  "images": "./images.json",
  "output": "./output",
  "format": "png",
  "filename": "{id}",
  "concurrency": 5
}
```

Then just run `gobanana generate` without flags.

## Programmatic Usage

```javascript
import { ImageGenerator } from 'gobanana';

const generator = new ImageGenerator({
  apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
  outputDir: './output',
  imageSize: '2K',
  outputFormat: 'png',
  filenameTemplate: '{id}'
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

### Brand Essence

| Field | Description |
|-------|-------------|
| `brand_essence.keywords` | Core style words (e.g., "minimal", "premium") |
| `brand_essence.personality` | Brand voice description |
| `brand_essence.visual_metaphor` | Guiding visual concept |

### Color System

| Field | Description |
|-------|-------------|
| `color_system.backgrounds` | Background colors and gradients |
| `color_system.accents.primary` | Primary accent color (hex) |
| `color_system.accents.secondary` | Secondary accent color |
| `color_system.accents.tertiary` | Tertiary/special accent |
| `color_system.usage_rules` | Color application guidelines |

### Geometry

| Field | Description |
|-------|-------------|
| `geometry.corner_radius` | Radius system (small/medium/large) |
| `geometry.shapes` | Allowed shape types |
| `geometry.icon_sizes` | Icon size standards |

### Depth & Effects

| Field | Description |
|-------|-------------|
| `depth_system.shadows` | Shadow style and direction |
| `depth_system.glow_primary` | Primary glow effect |
| `glow_effects.node_glow` | Glow for focal elements |
| `glow_effects.line_glow` | Glow for connection lines |

### Lines & Strokes

| Field | Description |
|-------|-------------|
| `line_system.weights` | Stroke weight system |
| `line_system.connection_style` | How elements connect |
| `stroke_system.caps` | Stroke cap style (round/square) |

### Composition & Rules

| Field | Description |
|-------|-------------|
| `composition.focal_point` | Where viewer's eye should land |
| `composition.negative_space` | Whitespace guidelines |
| `consistency_rules` | Universal rules for all images |
| `avoid` | Things to explicitly avoid |

## Image Definition Reference

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (used for filename) |
| `section` | Logical grouping |
| `title` | Human-readable title |
| `aspect_ratio` | Ratio: 1:1, 16:9, 4:3, 9:16, etc. |
| `prompt` | Main image generation prompt |

### Style Block

| Field | Description |
|-------|-------------|
| `style.lighting` | Light source and quality |
| `style.detail_level` | low, medium, medium-high, high |
| `style.ui_fidelity` | Realism level (mockup, diagram, illustration) |
| `style.mood` | Emotional tone |
| `style.color_temperature` | Warm/cool/neutral bias |
| `style.focal_point` | Primary focus area |

## Supported Aspect Ratios

`1:1`, `16:9`, `21:9`, `4:5`, `5:4`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`

## Resume & Progress

gobanana automatically tracks progress. If generation is interrupted:

```bash
# Resume from where you left off
gobanana generate -s style-guide.json -i images.json

# Or start fresh
gobanana clear
gobanana generate -s style-guide.json -i images.json
```

Progress is stored in `./output/.progress.json`.

## Examples

The `examples/` directory contains two complete example sets:

### Dark SaaS Dashboard
```bash
gobanana generate -s examples/style-guide.json -i examples/images.json
```
Dark mode, indigo/cyan accents, glowing elements, fintech aesthetic.

### Light Minimal Icons
```bash
gobanana generate -s examples/icons-style-guide.json -i examples/icons.json
```
Light mode, clean vectors, feature icons, process flows, infographics.

## License

MIT
