# tech-debt-extension README

A VS Code extension that allows you to create and manage GitHub issues tagged as tech-debt directly from your VS Code environment.

## Features

- **Create Tech Debt Issues**: Create GitHub issues tagged as tech-debt directly from VS Code with a user-friendly form.
- **View Tech Debt Issues**: View all tech-debt issues for your current repository in a dedicated tree view.
- **Edit Tech Debt Issues**: Update the title and description of existing tech debt issues with an intuitive editor.
- **Close/Reopen Issues**: Manage the state of tech debt issues directly from VS Code.
- **Comment on Issues**: Add comments to tech debt issues without leaving VS Code using the rich comment interface.
- **Filter Issues**: Filter tech debt issues by state (open/closed), creator, or assignee.
- **Easy Navigation**: Click on any issue to open it in your browser.
- **Detailed View**: View issue details in a rich formatted panel within VS Code.
- **Similar Issue Detection**: Automatically detect and show similar issues when creating new tech debt items.
- **Markdown Templates**: Quick access to templates for better formatting of issues and comments.

## Requirements

- A GitHub account
- A GitHub repository
- VS Code with Git extension installed

## Installation

### From VSIX

1. Download the .vsix file from the releases page.
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click on the "..." menu at the top of the Extensions view
5. Select "Install from VSIX..."
6. Choose the downloaded .vsix file

## Extension Settings

This extension contributes the following settings:

- `techDebtExtension.githubToken`: Optional GitHub personal access token (not required if using VS Code's built-in GitHub authentication).

## Known Issues

- The extension currently only works with GitHub repositories.
- Only supports the "tech-debt" label for now. Custom labels will be added in future versions.

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

### Managing Tech Debt Issues

#### Editing Issues

1. Right-click on an issue in the Tech Debt Issues view.
2. Select "Edit Issue" from the context menu.
3. Edit the title and body of the issue as needed.
4. Click "Save Changes" to update the issue.

#### Closing/Reopening Issues

1. Right-click on an open issue and select "Close Issue" to close it.
2. Right-click on a closed issue and select "Reopen Issue" to reopen it.

#### Commenting on Issues

1. Right-click on an issue and select "Comment on Issue".
2. Enter your comment in the editor that opens.
3. Click "Post Comment" to add your comment to the issue.

## Development

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

## Extension Settings

This extension contributes the following settings:

- `techDebtExtension.githubToken`: Optional GitHub personal access token (not required if using VS Code's built-in GitHub authentication).

## Known Issues

- The extension currently only works with GitHub repositories.
- Only supports the "tech-debt" label for now. Custom labels will be added in future versions.

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

### Managing Tech Debt Issues

#### Editing Issues
1. Right-click on an issue in the Tech Debt Issues view.
2. Select "Edit Issue" from the context menu.
3. Edit the title and body of the issue as needed.
4. Click "Save Changes" to update the issue.

#### Closing/Reopening Issues
1. Right-click on an open issue and select "Close Issue" to close it.
2. Right-click on a closed issue and select "Reopen Issue" to reopen it.

#### Commenting on Issues
1. Right-click on an issue and select "Comment on Issue".
2. Enter your comment in the editor that opens.
3. Click "Post Comment" to add your comment to the issue.

## Development

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
