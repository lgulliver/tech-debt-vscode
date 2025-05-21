# Change Log

All notable changes to the "tech-debt-extension" extension will be documented in this file.

## [0.3.4] - 2025-05-22

### Security

- Enhanced input sanitization to prevent injection attacks
- Added centralized string handling utilities with robust sanitization
- Improved URL parsing with stronger validation and sanitization
- Enhanced HTML escaping for user-provided inputs
- Added input validation for all GitHub API methods
- Applied best practices for command input sanitization

## [0.3.3] - 2025-05-21

### Added

- Implemented issue filtering by state (open/closed), creator, and assignee
- Added "Clear Filters" command to easily reset all applied filters

### Fixed

- Improved error handling for network connection issues
- Added retry mechanism for "other side closed" GitHub API errors
- Enhanced authentication error handling with clearer user messages
- Added connection timeout handling for more reliable GitHub interactions
- Ensured consistent tree view refresh behavior after all issue operations including comments

## [0.3.2] - 2025-05-21

### Added

- Icon!

## [0.3.1] - 2025-05-21

### Added

- Additional Git repository URL format support 
- Error handling for repository detection edge cases
- Enhanced documentation with more examples

### Fixed

- Fixed HttpError appearing during VS Code startup with improved initialization
- Implemented graceful error handling in the tree view
- Added informative user messages instead of error dialogs
- Fixed duplicate method declaration in GitHub API class

## [0.3.0] - 2025-05-15

### Added

- Added support for more repository URL formats
- Enhanced error handling and improved overall stability
- Expanded documentation with detailed usage instructions
- Improved test coverage for GitHub API operations
- Added contributing guidelines (CONTRIBUTING.md) for community involvement

### Fixed

- Fixed HttpError appearing when VS Code initially loads the extension
- Implemented delayed GitHub API initialization to improve startup experience
- Added user-friendly error messages in the tree view instead of error dialogs
- Fixed issue with duplicate method declarations

## [0.2.1] - 2025-05-12

### Fixed

- Fixed "Extension 'vscode.git' is not known or not activated" error when loading tech debt issues
- Added fallback mechanism to manually input repository details when Git extension is not available
- Improved error handling for Git repository detection

## [0.2.0] - 2025-05-08

### Added

- Enhanced user interface for tech debt management:
  - New web-based form for creating issues with live similar issue detection
  - Improved comment interface with templates and markdown support
  - Integrated edit form for modifying existing issues
  - Consistent UI experience across all tech debt operations

### Improved

- Better user experience with dedicated forms instead of temporary files
- Real-time validation and feedback
- Smoother workflow for creating and managing tech debt issues

## [0.1.1] - 2025-05-05

### Fixed

- Support for custom SSH configuration URLs (format: `git@github.com-customconfig:owner/repo.git`)
- Improved URL parsing for various GitHub URL formats including:
  - Standard HTTPS: `https://github.com/owner/repo.git`
  - Standard SSH: `git@github.com:owner/repo.git`
  - Custom SSH configurations: `git@github.com-customconfig:owner/repo.git`
  - Enterprise GitHub URLs: `https://github.enterprise.com/owner/repo.git`

## [0.1.0] - 2025-05-03

### Added

- Issue editing capabilities
- Ability to close and reopen issues
- Improved issue detail view with more action options
- Enhanced tree view with state-specific icons and labels
- Added unit tests for the GitHub API client

## [0.0.1] - 2025-04-28

### Added

- Initial release
- Create tech debt issues in GitHub
- View open tech debt issues in a tree view
- Authentication via VS Code's built-in GitHub authentication provider
