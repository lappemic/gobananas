import fs from 'node:fs';
import path from 'node:path';

const CONFIG_FILES = [
  '.stylegenrc',
  '.stylegenrc.json',
  'stylegen.config.json',
  '.stylegen.json',
];

/**
 * Loads configuration from a config file in the current directory
 * @returns {Object|null} Configuration object or null if not found
 */
export function loadConfigFile() {
  const cwd = process.cwd();

  for (const filename of CONFIG_FILES) {
    const filepath = path.join(cwd, filename);
    if (fs.existsSync(filepath)) {
      try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const config = JSON.parse(content);
        return { config, filepath };
      } catch (err) {
        console.warn(`Warning: Could not parse ${filename}: ${err.message}`);
      }
    }
  }

  return null;
}

/**
 * Merges CLI options with config file options
 * CLI options take precedence over config file
 * @param {Object} cliOptions - Options from command line
 * @param {Object} fileConfig - Options from config file
 * @returns {Object} Merged options
 */
export function mergeOptions(cliOptions, fileConfig) {
  if (!fileConfig) return cliOptions;

  const merged = { ...cliOptions };

  // Map config file keys to CLI option keys
  const keyMap = {
    styleGuide: 'styleGuide',
    images: 'images',
    output: 'output',
    model: 'model',
    size: 'size',
    format: 'format',
    filename: 'filename',
    concurrency: 'concurrency',
    interactive: 'interactive',
  };

  for (const [configKey, cliKey] of Object.entries(keyMap)) {
    // Only use config value if CLI option wasn't explicitly set
    if (fileConfig[configKey] !== undefined && merged[cliKey] === undefined) {
      merged[cliKey] = fileConfig[configKey];
    }
  }

  return merged;
}

/**
 * Gets the default config file template
 * @returns {Object} Default config template
 */
export function getConfigTemplate() {
  return {
    styleGuide: './style-guide.json',
    images: './images.json',
    output: './output',
    model: 'gemini-3-pro-image-preview',
    size: '2K',
    format: 'png',
    filename: '{id}',
    concurrency: 5,
    interactive: false,
  };
}
