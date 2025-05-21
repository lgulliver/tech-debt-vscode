# tech-debt-extension README

A VS Code extension that allows you to create and manage GitHub issues tagged as tech-debt directly from your VS Code environment.

## Features

- [x] **Create Tech Debt Issues**: Create GitHub issues tagged as tech-debt directly from VS Code with a user-friendly form.
- [x] **View Tech Debt Issues**: View all tech-debt issues for your current repository in a dedicated tree view.
- [x] **Easy Navigation**: Click on any issue to open it in your browser.
- [x] **Similar Issue Detection**: Automatically detect and show similar issues when creating new tech debt items.

## Planned Features

- [ ] **Detailed View**: View issue details in a rich formatted panel within VS Code.
- [ ] **Edit Tech Debt Issues**: Update the title and description of existing tech debt issues with an intuitive editor.
- [ ] **Close/Reopen Issues**: Manage the state of tech debt issues directly from VS Code.
- [ ] **Comment on Issues**: Add comments to tech debt issues without leaving VS Code using the rich comment interface.
- [ ] **Custom Labels**: Support for custom labels beyond "tech-debt" in future versions.
- [ ] **Enterprise Support**: Support for GitHub Enterprise URLs and custom SSH configurations.
- [ ] **Filter Issues**: Filter tech debt issues by state (open/closed), creator, or assignee.

## Requirements

- A GitHub account
- A GitHub repository

This will create a .vsix file that can be installed in VS Code.

## Contributing

Contributions to this extension are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute to this project.

## Extension Settings

This extension contributes the following settings:

- `techDebtExtension.githubToken`: Optional GitHub personal access token (not required if using VS Code's built-in GitHub authentication).

## Known Issues

- The extension currently only works with GitHub repositories.
- Only supports the "tech-debt" label for now. Custom labels will be added in future versions.
- Filters don't currently work in all circumstances. If you encounter issues, please report them.
- Filters are not currently cleared.

## Supported Repository URL Formats

This extension supports various GitHub repository URL formats:

- Standard HTTPS: `https://github.com/owner/repo.git`
- Standard SSH: `git@github.com:owner/repo.git`
- Custom SSH configurations: `git@github.com-customconfig:owner/repo.git`
- Enterprise GitHub URLs: `https://github.enterprise.com/owner/repo.git`

---

## Usage

### Authentication

The extension uses VS Code's built-in GitHub authentication. When you use it for the first time, it will prompt you to sign in to your GitHub account.

### Viewing Tech Debt Issues

1. Open the Tech Debt Issues view in the Explorer sidebar.
2. Click the refresh button to fetch the latest issues.
3. Click on any issue to open it in your browser.
4. Use the filter button to filter issues by state, creator, or assignee.

## Development

### Release Process

This extension uses GitHub Actions for automated releases. For detailed information on creating releases, see the [Release Process Documentation](./docs/RELEASE_PROCESS.md).

To create a new release:

1. Update the `CHANGELOG.md` with your changes following the format: `## [VERSION] - YYYY-MM-DD`
2. Use the included script to create a new release: `scripts/create-release.sh 0.3.2`
3. Push the commit and tag to trigger the GitHub Actions workflow

The workflow will automatically:
- Build the extension
- Extract release notes from CHANGELOG.md
- Create a draft GitHub release with the VSIX file attached
- Support both tag-based and manual release triggers

### Building the Extension

1. Clone the repository
2. Run `yarn install` to install dependencies
3. Run `yarn watch` to compile the extension
4. Press F5 to open a new window with the extension loaded

### Packaging the Extension

To create a VSIX package that can be installed in VS Code:

```bash
yarn package
```

This will create a .vsix file that can be installed in VS Code.

## Contributing

Contributions to this extension are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute to this project.
