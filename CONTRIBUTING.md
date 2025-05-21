# Contributing to Tech Debt Manager

Thank you for your interest in contributing to the Tech Debt Manager extension! This document provides guidelines and instructions for contributing to this project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Development Environment Setup](#development-environment-setup)
  - [Building and Testing](#building-and-testing)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Coding Guidelines](#coding-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Development Environment Setup

1. Fork and clone the repository
   ```
   git clone https://github.com/YOUR-USERNAME/tech-debt-extension.git
   cd tech-debt-extension
   ```

2. Install dependencies
   ```
   yarn install
   ```

3. Open the project in VS Code
   ```
   code .
   ```

### Building and Testing

- **Build**: Run `yarn compile` to compile the extension
- **Watch**: Run `yarn watch` to watch for changes and automatically compile
- **Test**: Run `yarn test` to run the test suite
- **Package**: Run `yarn build-vsix` to create a VSIX package

To debug the extension, press `F5` in VS Code to launch a new Extension Development Host window with the extension loaded.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue list to see if the problem has already been reported. If it has and the issue is still open, add a comment to the existing issue instead of opening a new one.

When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title** for the issue
- **Provide steps to reproduce the problem**
- **Describe the expected behavior**
- **Describe the actual behavior**
- **Include screenshots** if possible
- **Include your environment information** (VS Code version, extension version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **Include mockups or examples** if applicable

### Pull Requests

1. **Create a branch**: Create a topic branch from where you want to base your work
   ```
   git checkout -b my-branch main
   ```

2. **Make your changes**: Make your changes and ensure they are working correctly

3. **Run the tests**: Ensure all tests pass
   ```
   yarn test
   ```

4. **Commit your changes**: Commit your changes with a meaningful commit message

5. **Push to your fork**: Push your changes to your fork on GitHub
   ```
   git push origin my-branch
   ```

6. **Submit a pull request**: Open a pull request against the main repository

## Coding Guidelines

- Follow the existing code style
- Write clear, readable, and maintainable code
- Include appropriate comments
- Update documentation when necessary
- Add tests for new features

## Commit Message Guidelines

We follow a simplified version of the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: Code changes that neither fix a bug nor add a feature
- **test**: Adding or modifying tests
- **chore**: Changes to the build process or auxiliary tools

Examples:
```
feat: add filtering by assignee
fix: correct issue creation form validation
docs: update installation instructions
```

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md and RELEASE_NOTES.md
3. Run tests to ensure everything is working
4. Create a VSIX package with `yarn build-vsix`
5. Create a GitHub release with the VSIX attached

---

Thank you for contributing to the Tech Debt Manager extension!
