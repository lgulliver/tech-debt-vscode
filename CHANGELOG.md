# Change Log

All notable changes to the "tech-debt-extension" extension will be documented in this file.

## [0.3.0] - 2025-05-21

### Added in 0.3.0

- Added support for more repository URL formats
- Enhanced error handling and improved overall stability
- Expanded documentation with detailed usage instructions
- Improved test coverage for GitHub API operations

## [0.2.1] - 2025-05-20

### Fixed in 0.2.1

- Fixed "Extension 'vscode.git' is not known or not activated" error when loading tech debt issues
- Added fallback mechanism to manually input repository details when Git extension is not available
- Improved error handling for Git repository detection

## [0.2.0] - 2025-05-21

### Added in 0.2.0

- Enhanced user interface for tech debt management:
  - New web-based form for creating issues with live similar issue detection
  - Improved comment interface with templates and markdown support
  - Integrated edit form for modifying existing issues
  - Consistent UI experience across all tech debt operations

### Improved in 0.2.0

- Better user experience with dedicated forms instead of temporary files
- Real-time validation and feedback
- Smoother workflow for creating and managing tech debt issues

## [0.1.1] - 2025-05-20

### Fixed in 0.1.1

- Support for custom SSH configuration URLs (format: `git@github.com-customconfig:owner/repo.git`)
- Improved URL parsing for various GitHub URL formats including:
  - Standard HTTPS: `https://github.com/owner/repo.git`
  - Standard SSH: `git@github.com:owner/repo.git`
  - Custom SSH configurations: `git@github.com-customconfig:owner/repo.git`
  - Enterprise GitHub URLs: `https://github.enterprise.com/owner/repo.git`

## [0.1.0] - 2025-05-18

### Added in 0.1.0

- Issue editing capabilities
- Ability to close and reopen issues
- Improved issue detail view with more action options
- Enhanced tree view with state-specific icons and labels
- Added unit tests for the GitHub API client

## [0.0.1] - 2025-05-10

### Added in 0.0.1

- Initial release
- Create tech debt issues in GitHub
- View open tech debt issues in a tree view
- Authentication via VS Code's built-in GitHub authentication provider
