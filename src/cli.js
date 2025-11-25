#!/usr/bin/env node

import 'dotenv/config';
import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs';
import path from 'node:path';
import { ImageGenerator } from './generator.js';
import { ProgressTracker } from './progress-tracker.js';
import { buildPrompt } from './prompt-builder.js';
import { loadConfigFile, mergeOptions, getConfigTemplate } from './config-loader.js';

/**
 * Loads and validates JSON file
 * @param {string} filepath - Path to JSON file
 * @returns {Object} Parsed JSON
 */
function loadJson(filepath) {
  const absolutePath = path.resolve(filepath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Interactive prompt for reference images
 * @param {Object} image - Image definition
 * @returns {Array} Array of reference image paths
 */
async function promptForReferenceImages(image) {
  console.log(chalk.cyan(`\n--- Image: ${image.title} ---`));
  console.log(chalk.gray(`ID: ${image.id}`));
  console.log(chalk.gray(`Section: ${image.section}`));
  console.log(chalk.gray(`Aspect: ${image.aspect_ratio}`));
  console.log(chalk.dim(`\nPrompt preview: ${image.prompt.substring(0, 150)}...`));

  const { addReferences } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addReferences',
      message: 'Add reference images for this generation?',
      default: false,
    },
  ]);

  if (!addReferences) {
    return [];
  }

  const referenceImages = [];
  let addMore = true;

  while (addMore && referenceImages.length < 14) {
    const { refPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'refPath',
        message: `Reference image path (${referenceImages.length + 1}/14):`,
        validate: (input) => {
          if (!input.trim()) return 'Path cannot be empty';
          const resolved = path.resolve(input.trim());
          if (!fs.existsSync(resolved)) return `File not found: ${resolved}`;
          return true;
        },
      },
    ]);

    referenceImages.push(path.resolve(refPath.trim()));

    if (referenceImages.length < 14) {
      const { more } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'more',
          message: 'Add another reference image?',
          default: false,
        },
      ]);
      addMore = more;
    }
  }

  console.log(chalk.green(`Added ${referenceImages.length} reference image(s)`));
  return referenceImages;
}

/**
 * Main generate command
 */
async function generateCommand(cliOptions) {
  const spinner = ora();

  try {
    // Load config file and merge with CLI options
    const configResult = loadConfigFile();
    if (configResult) {
      console.log(chalk.gray(`Using config from ${configResult.filepath}`));
    }
    const options = mergeOptions(cliOptions, configResult?.config);

    // Load configuration files
    spinner.start('Loading configuration files...');
    const styleGuide = loadJson(options.styleGuide);
    const imagesConfig = loadJson(options.images);
    const images = imagesConfig.images || imagesConfig;
    spinner.succeed(`Loaded style guide and ${images.length} image definitions`);

    // Validate images array
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('No images found in configuration');
    }

    // Show summary and confirm
    console.log(chalk.bold('\nGeneration Summary:'));
    console.log(chalk.gray(`  Style Guide: ${options.styleGuide}`));
    console.log(chalk.gray(`  Images: ${images.length} total`));
    console.log(chalk.gray(`  Output: ${options.output}`));
    console.log(chalk.gray(`  Model: ${options.model}`));
    console.log(chalk.gray(`  Image Size: ${options.size}`));
    console.log(chalk.gray(`  Format: ${options.format}`));
    console.log(chalk.gray(`  Filename: ${options.filename}.${options.format}`));
    console.log(chalk.gray(`  Concurrency: ${options.concurrency} parallel requests`));

    // Check for existing progress
    const tracker = new ProgressTracker(options.output);
    const stats = tracker.getStats();
    if (stats.completed > 0) {
      console.log(chalk.yellow(`\n  Existing progress: ${stats.completed} completed, ${stats.failed} failed`));
    }

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: stats.completed > 0 ? 'Resume generation?' : 'Start generation?',
        default: true,
      },
    ]);

    if (!proceed) {
      console.log(chalk.gray('Generation cancelled'));
      return;
    }

    // Fresh start option if there's existing progress
    let freshStart = false;
    if (stats.completed > 0) {
      const { startFresh } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'startFresh',
          message: 'Start fresh (ignore previous progress)?',
          default: false,
        },
      ]);
      freshStart = startFresh;
    }

    // Initialize generator
    const generator = new ImageGenerator({
      apiKey: options.apiKey || process.env.GOOGLE_AI_STUDIO_API_KEY,
      model: options.model,
      outputDir: options.output,
      imageSize: options.size,
      outputFormat: options.format,
      filenameTemplate: options.filename,
    });

    // Run batch generation
    console.log(chalk.bold('\nStarting generation...\n'));

    const results = await generator.generateBatch(styleGuide, images, {
      freshStart,
      concurrency: parseInt(options.concurrency, 10),
      onProgress: (msg) => console.log(chalk.gray(`  ${msg}`)),
      onImageStart: (img, current, total) => {
        console.log(chalk.blue(`\n[${current}/${total}] Processing: ${img.title}`));
      },
      getReferenceImages: options.interactive ? promptForReferenceImages : null,
    });

    // Print summary
    console.log(chalk.bold('\n=== Generation Complete ==='));
    console.log(chalk.green(`  Successful: ${results.successful.length}`));
    console.log(chalk.red(`  Failed: ${results.failed.length}`));
    console.log(chalk.gray(`  Skipped (already done): ${results.skipped}`));

    if (results.failed.length > 0) {
      console.log(chalk.yellow('\nFailed images:'));
      results.failed.forEach((f) => {
        console.log(chalk.red(`  - ${f.imageId}: ${f.error}`));
      });
    }

    console.log(chalk.gray(`\nOutput saved to: ${path.resolve(options.output)}`));
  } catch (err) {
    spinner.fail(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * List images command
 */
function listCommand(options) {
  try {
    const imagesConfig = loadJson(options.images);
    const images = imagesConfig.images || imagesConfig;

    console.log(chalk.bold(`\nImages in ${options.images}:\n`));

    images.forEach((img, i) => {
      console.log(chalk.cyan(`${i + 1}. ${img.title}`));
      console.log(chalk.gray(`   ID: ${img.id}`));
      console.log(chalk.gray(`   Section: ${img.section}`));
      console.log(chalk.gray(`   Aspect: ${img.aspect_ratio}`));
      console.log();
    });

    console.log(chalk.gray(`Total: ${images.length} images`));
  } catch (err) {
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Status command - check progress
 */
function statusCommand(options) {
  const tracker = new ProgressTracker(options.output);
  const stats = tracker.getStats();

  console.log(chalk.bold('\nGeneration Progress:\n'));
  console.log(chalk.gray(`  Started: ${stats.startedAt}`));
  console.log(chalk.green(`  Completed: ${stats.completed}`));
  console.log(chalk.red(`  Failed: ${stats.failed}`));

  const progress = tracker.progress;
  if (progress.completed.length > 0) {
    console.log(chalk.green('\n  Completed images:'));
    progress.completed.forEach((id) => console.log(chalk.gray(`    - ${id}`)));
  }

  if (progress.failed.length > 0) {
    console.log(chalk.red('\n  Failed images:'));
    progress.failed.forEach((f) => {
      console.log(chalk.gray(`    - ${f.id} (${f.attempts} attempts): ${f.lastError}`));
    });
  }
}

/**
 * Clear progress command
 */
function clearCommand(options) {
  const tracker = new ProgressTracker(options.output);
  tracker.clear();
  console.log(chalk.green('Progress cleared'));
}

/**
 * Estimates cost based on prompt tokens and image count
 * Pricing is approximate and may vary
 */
function estimateCost(images, prompts) {
  // Approximate token count (1 token ~ 4 chars)
  const totalChars = prompts.reduce((sum, p) => sum + p.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  // Gemini image generation pricing (approximate, varies by model)
  // Input: ~$0.00025 per 1K tokens
  // Output image: ~$0.02 per image (varies by resolution)
  const inputCost = (estimatedTokens / 1000) * 0.00025;
  const outputCost = images.length * 0.02;
  const totalCost = inputCost + outputCost;

  return {
    imageCount: images.length,
    estimatedTokens,
    inputCost,
    outputCost,
    totalCost,
  };
}

/**
 * Dry-run command - preview prompts without API calls
 */
async function dryRunCommand(options) {
  try {
    const styleGuide = loadJson(options.styleGuide);
    const imagesConfig = loadJson(options.images);
    const images = imagesConfig.images || imagesConfig;

    console.log(chalk.bold(`\nDry Run: Previewing ${images.length} prompts\n`));
    console.log(chalk.gray('=' .repeat(60)));

    const prompts = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const prompt = buildPrompt(styleGuide, image);
      prompts.push(prompt);

      console.log(chalk.cyan(`\n[${i + 1}/${images.length}] ${image.title}`));
      console.log(chalk.gray(`ID: ${image.id}`));
      console.log(chalk.gray(`Section: ${image.section}`));
      console.log(chalk.gray(`Aspect Ratio: ${image.aspect_ratio}`));
      console.log(chalk.gray(`Prompt Length: ${prompt.length} characters`));

      if (options.full) {
        console.log(chalk.gray('\n--- Full Prompt ---'));
        console.log(prompt);
        console.log(chalk.gray('--- End Prompt ---\n'));
      } else {
        console.log(chalk.gray(`\nPrompt Preview: ${image.prompt.substring(0, 150)}...`));
      }

      console.log(chalk.gray('-'.repeat(60)));
    }

    // Cost estimation
    const cost = estimateCost(images, prompts);
    console.log(chalk.bold('\nCost Estimate:'));
    console.log(chalk.gray(`  Images: ${cost.imageCount}`));
    console.log(chalk.gray(`  Estimated tokens: ~${cost.estimatedTokens.toLocaleString()}`));
    console.log(chalk.gray(`  Input cost: ~$${cost.inputCost.toFixed(4)}`));
    console.log(chalk.gray(`  Output cost: ~$${cost.outputCost.toFixed(2)}`));
    console.log(chalk.yellow(`  Total estimate: ~$${cost.totalCost.toFixed(2)}`));
    console.log(chalk.dim('  (Actual costs may vary based on model and settings)'));

    console.log(chalk.gray('\nRun without --dry-run to generate images'));
  } catch (err) {
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }
}

// CLI setup
program
  .name('stylegen')
  .description('Batch generate AI images with consistent style using Gemini API')
  .version('1.0.0');

program
  .command("generate")
  .description("Generate images from style guide and image definitions")
  .requiredOption("-s, --style-guide <path>", "Path to style guide JSON file")
  .requiredOption("-i, --images <path>", "Path to images definition JSON file")
  .option("-o, --output <path>", "Output directory", "./output")
  .option(
    "-k, --api-key <key>",
    "Gemini API key (or use GOOGLE_AI_STUDIO_API_KEY env var)"
  )
  .option("-m, --model <model>", "Model to use", "gemini-3-pro-image-preview")
  .option("--size <size>", "Image size: 1K, 2K, or 4K", "2K")
  .option("-c, --concurrency <number>", "Number of parallel requests", "5")
  .option("-f, --format <format>", "Output format: png, jpg, webp", "png")
  .option("--filename <template>", "Filename template: {id}, {section}, {title}, {ratio}", "{id}")
  .option(
    "--interactive",
    "Prompt for reference images before each generation",
    true
  )
  .option("--no-interactive", "Skip reference image prompts")
  .action(generateCommand);

program
  .command('list')
  .description('List all images in a configuration file')
  .requiredOption('-i, --images <path>', 'Path to images definition JSON file')
  .action(listCommand);

program
  .command('status')
  .description('Check generation progress')
  .option('-o, --output <path>', 'Output directory', './output')
  .action(statusCommand);

program
  .command('clear')
  .description('Clear generation progress')
  .option('-o, --output <path>', 'Output directory', './output')
  .action(clearCommand);

program
  .command('dry-run')
  .description('Preview prompts without making API calls')
  .requiredOption('-s, --style-guide <path>', 'Path to style guide JSON file')
  .requiredOption('-i, --images <path>', 'Path to images definition JSON file')
  .option('--full', 'Show full prompts instead of previews', false)
  .action(dryRunCommand);

program
  .command('init')
  .description('Create a config file in the current directory')
  .action(async () => {
    const configPath = path.join(process.cwd(), '.stylegenrc.json');

    if (fs.existsSync(configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '.stylegenrc.json already exists. Overwrite?',
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(chalk.gray('Cancelled'));
        return;
      }
    }

    const template = getConfigTemplate();
    fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
    console.log(chalk.green(`Created ${configPath}`));
    console.log(chalk.gray('\nEdit the file to configure your project, then run:'));
    console.log(chalk.cyan('  stylegen generate'));
  });

program.parse();
