# Contributing to stylegen

Thanks for your interest in contributing! This document outlines how to get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run tests:
   ```bash
   npm test
   ```

## Making Changes

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and add tests if applicable

3. Run tests to ensure everything passes:
   ```bash
   npm test
   ```

4. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: add new feature"
   ```

   We use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `test:` - Test changes
   - `refactor:` - Code refactoring

5. Push to your fork and create a Pull Request

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- Add tests for new functionality
- Ensure CI passes before requesting review

## Reporting Issues

When reporting bugs, please include:
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

## Feature Requests

Feature requests are welcome! Please:
- Check existing issues first to avoid duplicates
- Describe the use case clearly
- Explain why this would benefit other users

## Code Style

- Use ES modules (`import`/`export`)
- Follow existing patterns in the codebase
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

## Questions?

Feel free to open an issue for any questions about contributing.
