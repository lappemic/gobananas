# Open Source Release Plan

## High Priority

- [x] **1. README.md** - Your storefront
  - [x] Clear value proposition (what problem it solves)
  - [x] Quick start (< 30 seconds to first image)
  - [ ] GIF/screenshot of CLI in action (requires actual generation)
  - [x] Badge for npm version, license

- [x] **2. Generalize the naming**
  - [x] Rename package from "nano-banana" to "stylegen"
  - [x] Remove LocalePay-specific examples, make them generic
  - [x] Update CLI command name

- [x] **3. TypeScript + JSDoc**
  - [x] Add JSDoc types to all functions
  - [x] Create type definitions (.d.ts) for programmatic users
  - [x] Export types in package.json

- [x] **4. Error messages**
  - [x] More helpful errors (e.g., "Invalid API key" vs cryptic Google errors)
  - [x] Link to docs in error output

## Medium Priority

- [x] **5. Tests**
  - [x] Unit tests for prompt-builder
  - [ ] Mock API tests for generator (future)
  - [ ] CLI integration tests (future)

- [x] **6. CI/CD**
  - [x] GitHub Actions for lint + test
  - [x] Automated npm publish on release tags

- [x] **7. Community files**
  - [x] LICENSE (MIT)
  - [x] CONTRIBUTING.md
  - [x] Issue templates
  - [ ] PR template (optional)

- [x] **8. Flexibility**
  - [x] Support output formats beyond PNG (JPEG, WebP)
  - [x] Custom output filename templates
  - [ ] Webhook/callback on completion (future)

## Nice to Have

- [x] **9. Dry-run mode** - Preview prompts without API calls
- [x] **10. Cost estimation** - Estimate API costs before running
- [x] **11. Config file support** - `.stylegenrc.json` with `init` command
