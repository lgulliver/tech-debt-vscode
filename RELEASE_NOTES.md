# Tech Debt Extension Release Notes

## Version 0.3.3 - Feature Enhancements & Error Handling (2025-05-21)

### Feature Enhancements

1. **Issue Filtering**
   - Implemented filtering by state (open/closed)
   - Added creator and assignee filtering options
   - Added "Clear Filters" command to easily reset all applied filters
   - Improved filter UI with clearer options and visual indicators

2. **Error Handling & Reliability**
   - Added retry mechanism for "other side closed" GitHub API errors
   - Implemented exponential backoff for network connection issues
   - Enhanced authentication error handling with clearer user messages
   - Added connection timeout handling for more reliable GitHub interactions

3. **UI Improvements**
   - Ensured consistent tree view refresh behavior across all operations
   - Added consistent refresh after adding comments to issues
   - Improved notification timing and messaging after operations
   - Enhanced visual feedback during operations with progress indicators

### Completed Tasks for 0.3.3

- [x] Implemented issue filter functionality (by state, creator, assignee)
- [x] Added clear filter command and UI option
- [x] Fixed "other side closed" connection errors with retry mechanism
- [x] Enhanced error handling with specific error types and messages
- [x] Improved tree view refresh mechanism for all issue operations
- [x] Updated documentation and changelog

## Version 0.3.2 - Workflow Improvements (2025-05-21)

### Release Automation Enhancements

1. **Streamlined Release Process**
   - Improved release workflow with automated tag management
   - Added helper script for release creation (`scripts/create-release.sh`)
   - Added detailed release process documentation in `docs/RELEASE_PROCESS.md`
   - Enhanced error handling in the GitHub Actions workflows

2. **GitHub Integration Improvements**
   - Updated GitHub Actions workflows for better release management
   - Improved changelog extraction for GitHub releases
   - Automated VSIX packaging and attachment to releases
   - Added support for manual workflow triggers with tag specification

3. **Documentation Updates**
   - Added comprehensive release process documentation
   - Updated README with release workflow information
   - Improved CHANGELOG.md formatting for better parsing

### Completed Tasks for 0.3.2

- [x] Added permissions for GitHub releases in workflows
- [x] Implemented manual workflow triggering with tag input
- [x] Improved changelog extraction for release notes
- [x] Enhanced tag handling logic with existence verification
- [x] Created helper script for version management and releases
- [x] Added comprehensive release process documentation

## Version 0.3.1 - Bug Fixes & Stability (2025-05-21)

### Improvements

- Added additional Git repository URL format support
- Enhanced error handling for repository detection edge cases
- Added more comprehensive documentation with examples

### Bug Fixes

- Fixed HttpError appearing during VS Code startup with improved initialization
- Implemented graceful error handling in the tree view
- Added informative user messages instead of error dialogs
- Fixed duplicate method declaration in GitHub API class

## Version 0.3.0 Enhancements

### Core Functionality Improvements

1. **Repository URL Support**
   - Added support for all common GitHub repository URL formats
   - Added proper handling for custom SSH configurations
   - Improved enterprise GitHub URL detection and parsing

2. **Stability & Error Handling**
   - Enhanced error handling for GitHub API interactions
   - Added fallback mechanisms for missing Git extension
   - Improved error messages with actionable suggestions
   - Better handling of network and authentication issues
   - Fixed HttpError appearing during VS Code startup
   - Implemented delayed GitHub API initialization
   - Added user-friendly error messages instead of error dialogs

3. **Testing & Quality**
   - Expanded test coverage for GitHub API operations
   - Added more comprehensive error case tests
   - Improved test structure and organization

### Documentation Updates

- Added detailed examples for all supported repository formats
- Expanded usage instructions in the README
- Updated troubleshooting section with common issues
- Added contributing guidelines (CONTRIBUTING.md) for community involvement

### Completed Tasks for 0.3.0

- [x] Bumped version number from 0.2.1 to 0.3.0
- [x] Added more robust repository URL parsing
- [x] Fixed HttpError appearing during VS Code startup
- [x] Improved error handling in the tree view
- [x] Added contributing guidelines
- [x] Enhanced documentation and release notes
- [x] Fixed duplicate method declaration
- [x] Added graceful handling of initialization errors

- [x] Add support for more repository URL formats
- [x] Enhance error handling and improve stability
- [x] Expand documentation with detailed instructions
- [x] Improve test coverage
- [x] Update version and release notes

## Version 0.1.0 Enhancements

### Core Functionality Additions

1. **Issue Management**
   - Added ability to edit existing tech debt issues (title and description)
   - Added capability to close and reopen issues directly from VS Code
   - Updated context menu with conditional actions based on issue state

2. **Improved UI/UX**
   - Enhanced tree view items with state-specific icons (open/closed)
   - Added detailed tooltips showing issue state and descriptions
   - Improved issue detail webview with more action buttons
   - Added visual indicators for issue state in the tree view

3. **Testing & Quality**
   - Added unit tests for the GitHub API client
   - Created test mocks using Sinon
   - Ensured code works with proper error handling

### Marketplace Preparation

- Updated package.json with publisher and repository information
- Added keywords for better discoverability in the marketplace
- Added build-vsix script for easy packaging
- Updated version number to 0.1.0

### Documentation

- Updated README with new features and examples
- Added detailed usage instructions for all new features

## Next Steps

1. **Testing & Quality Assurance**
   - Perform end-to-end testing with actual GitHub repositories
   - Add more comprehensive unit tests for all components

2. **User Experience Improvements**
   - Add notifications for external issue changes
   - Implement issue assignment functionality
   - Add label management beyond just the "tech-debt" label

3. **Publishing**
   - Prepare for publishing to the VS Code Marketplace
   - Create promotional assets (screenshots, logo, etc.)

## Completed Tasks Checklist

- [x] Implement issue editing functionality
- [x] Add close/reopen functionality
- [x] Update UI for better visual indicators
- [x] Add unit tests
- [x] Prepare for marketplace publishing
- [x] Update documentation

## Pending Tasks

- [ ] Complete end-to-end testing
- [ ] Create promotional assets
- [ ] Implement issue assignment
- [ ] Add support for custom labels
