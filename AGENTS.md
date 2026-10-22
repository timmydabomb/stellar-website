Whatever action you can do yourself please do yourself, which includes starting the app testing and verification.

# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a blank Git workspace: it has no application source, tests, assets, or build configuration yet. As the project is introduced, keep production code in a clearly named source directory (such as `src/`), tests in `tests/` or beside the modules they cover, and static files in `public/` or `assets/`. Update this guide when the actual structure is established; do not assume a framework or tooling that is not checked in.

## Build, Test, and Development Commands

Contributors and agents should carry out the work they can do themselves, including starting the app, testing, and verification.

No build, test, or local development commands are configured yet. When adding a runtime or framework, add its manifest and lockfile, document the exact install/build/test/dev commands here, and make sure those commands work from the repository root. Do not report a check as passing unless you ran it.

## Coding Style & Naming Conventions

Follow the conventions of the language and framework selected for the project, and keep formatting consistent within each module. Use descriptive names that reflect behavior; prefer lowercase kebab-case for filenames unless the chosen ecosystem has a standard convention. Add and document a formatter or linter when the project adopts one, and run it before submitting changes.

## Testing Guidelines

There is no test framework or coverage requirement configured. Add tests alongside new behavior, use names that describe the scenario (for example, `navigation.test.ts`), and document the chosen test command and any required fixtures when test tooling is introduced.

## Commit & Pull Request Guidelines

Git history is empty, so no repository-specific commit convention can be inferred. Use concise, imperative commit subjects (for example, `Add landing page layout`). Pull requests should explain the change and its purpose, list relevant checks and their results, and include screenshots for visible UI changes. Link related issues when applicable.

## Security & Configuration

Keep credentials and local environment files out of version control. Provide safe example configuration with placeholder values when setup requires environment variables, and document required variables without exposing secrets.



