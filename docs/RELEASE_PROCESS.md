# Release Process for Tech Debt Manager Extension

This document outlines the process for creating new releases of the Tech Debt Manager VS Code extension.

## Automated Release Process

The extension uses GitHub Actions for automated releases. There are two ways to trigger a release:

### 1. Push a Git Tag

When you push a Git tag in the format `v*.*.*` (e.g., `v1.2.3`), the release workflow will automatically:

1. Build the extension
2. Run linting
3. Package the VSIX file
4. Extract the relevant section from the CHANGELOG.md file
5. Create a draft GitHub release with the VSIX file attached

```bash
# Example workflow to create a new release via tags
git tag v0.3.2
git push origin v0.3.2
```

### 2. Manually Trigger the Workflow

You can also manually trigger the release workflow from the GitHub Actions UI:

1. Go to the GitHub repository
2. Click on "Actions"
3. Select the "Release" workflow
4. Click "Run workflow"
5. Enter:
   - The tag name (e.g., `v0.3.2`)
   - Whether to create as draft (default: true)
6. Click "Run workflow"

This method allows more control and is useful when you want to prepare releases in advance.

## Changelog Format

The release workflow extracts content from CHANGELOG.md. To ensure proper extraction, follow this format:

```markdown
# Change Log

## [0.3.2] - 2025-05-25

### Added
- New feature description

### Fixed
- Bug fix description

## [0.3.1] - 2025-05-21
...
```

Each version must:
- Have a header in the format `## [VERSION] - DATE`
- Include separate sections for Added, Fixed, Changed, etc.

## Post-Release Steps

After a release is created:

1. Verify the draft release on GitHub
2. Review the changelog information
3. Make any necessary adjustments to the release notes
4. Publish the release when ready
5. Update the version in package.json for the next development cycle
