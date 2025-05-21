// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';
import { TechDebtIssuesProvider, TechDebtIssueItem } from './tech-debt-issues-view';
import { IssueFormPanel } from './issue-form-panel';
import { IssueDetailsPanel } from './issue-details-panel';
import { CommentFormPanel } from './comment-form-panel';
import { EditIssueFormPanel } from './edit-issue-form-panel';

// Status bar item
let statusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Get configuration
	const config = vscode.workspace.getConfiguration('techDebt');
	const token = config.get<string>('githubToken') || '';
	let owner = config.get<string>('githubOwner') || '';
	let repo = config.get<string>('githubRepo') || '';
	
	// Initialize GitHub API
	const githubApi = GitHubAPI.getInstance();
	
	// Initialize the TreeView provider
	const techDebtIssuesProvider = new TechDebtIssuesProvider(githubApi);
	const treeView = vscode.window.createTreeView('techDebtIssues', {
		treeDataProvider: techDebtIssuesProvider,
		showCollapseAll: true
	});
	
	// Create status bar item
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "$(report) Tech Debt";
	statusBarItem.tooltip = "Create tech debt issue";
	statusBarItem.command = 'tech-debt-extension.createTechDebtIssue';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Delay GitHub API initialization to avoid HTTP errors during startup
	const delayedInitialization = setTimeout(async () => {
		try {
			// Initialize the GitHub API (authentication)
			if (!await githubApi.initialize()) {
				console.log('GitHub API initialization deferred until needed');
			}
		} catch (error: any) {
			// Only log to console, don't show error message during startup
			console.log('Deferred GitHub API initialization: ' + error.message);
		}
	}, 5000); // 5 second delay
	
	// Register to clean up the timeout if VS Code is closed before it fires
	context.subscriptions.push({ dispose: () => clearTimeout(delayedInitialization) });
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	console.log('Congratulations, your extension "tech-debt-extension" is now active!');
	
	// Register the command to create a new tech debt issue
	const createIssueCommand = vscode.commands.registerCommand('tech-debt-extension.createTechDebtIssue', async () => {
		try {
			// Initialize GitHub API if needed
			await githubApi.initialize();
			
			// Get selected text if any
			let initialContent = '';
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor && !activeEditor.selection.isEmpty) {
				const selectedText = activeEditor.document.getText(activeEditor.selection);
				const fileName = activeEditor.document.fileName.split('/').pop() || '';
				initialContent = `## Selected Code (from ${fileName})\n\`\`\`\n${selectedText}\n\`\`\`\n\n`;
			}
			
			// Show the issue form panel
			IssueFormPanel.createOrShow(context.extensionUri, githubApi, techDebtIssuesProvider, '', initialContent);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to create tech debt issue: ${error.message}`);
		}
	});
	
	// Register the command to view tech debt issues
	const viewIssuesCommand = vscode.commands.registerCommand('tech-debt-extension.viewTechDebtIssues', async () => {
		try {
			// Refresh the tree view
			techDebtIssuesProvider.refresh();
			
			// Focus the tree view
			await vscode.commands.executeCommand('techDebtIssues.focus');
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to view tech debt issues: ${error.message}`);
		}
	});
	
	// Register command to refresh the issues list
	const refreshCommand = vscode.commands.registerCommand('tech-debt-extension.refreshTechDebtIssues', () => {
		techDebtIssuesProvider.refresh();
	});

	// Register command to comment on an issue
	const commentCommand = vscode.commands.registerCommand('tech-debt-extension.commentOnIssue', async (item: TechDebtIssueItem) => {
		try {
			// Initialize GitHub API if needed
			await githubApi.initialize();
			
			if (!item) {
				vscode.window.showErrorMessage('No issue selected');
				return;
			}
			
			// Show the comment form panel
			CommentFormPanel.createOrShow(
				context.extensionUri, 
				githubApi, 
				item.issue.number, 
				item.issue.title,
				'',
				techDebtIssuesProvider
			);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to add comment: ${error.message}`);
		}
	});

	// Import the IssueDetailsPanel
	const { IssueDetailsPanel } = require('./issue-details-panel');
	
	// Register command to view issue details
	const viewDetailsCommand = vscode.commands.registerCommand('tech-debt-extension.viewIssueDetails', async (item: TechDebtIssueItem) => {
		try {
			// Initialize GitHub API if needed
			await githubApi.initialize();
			
			if (!item) {
				vscode.window.showErrorMessage('No issue selected');
				return;
			}
			
			// Show issue details in webview panel
			IssueDetailsPanel.createOrShow(context.extensionUri, item.issue.number, githubApi);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to view issue details: ${error.message}`);
		}
	});

	// Register command to filter issues
	const filterCommand = vscode.commands.registerCommand('tech-debt-extension.filterIssues', async () => {
		try {
			// Initialize GitHub API if needed
			await githubApi.initialize();
			
			// Define filter options
			const filterOptions = [
				{ label: 'Show all issues', description: 'Show both open and closed issues' },
				{ label: 'Show open issues', description: 'Show only open issues', state: 'open' },
				{ label: 'Show closed issues', description: 'Show only closed issues', state: 'closed' },
				{ label: 'Filter by creator', description: 'Show issues created by a specific user', creator: true },
				{ label: 'Filter by assignee', description: 'Show issues assigned to a specific user', assignee: true },
				{ label: 'Clear all filters', description: 'Reset to default filters', clear: true }
			];
			
			// Show quick pick
			const selectedFilter = await vscode.window.showQuickPick(filterOptions, {
				placeHolder: 'Select filter',
				canPickMany: false
			});
			
			if (!selectedFilter) {
				return; // User cancelled
			}
			
			// Handle filter selection
			if (selectedFilter.clear) {
				// Clear all filters
				techDebtIssuesProvider.clearFilter();
				vscode.window.showInformationMessage('Filters cleared');
			} else if (selectedFilter.state) {
				// Filter by state
				techDebtIssuesProvider.setFilter({ state: selectedFilter.state });
			} else if (selectedFilter.creator) {
				// Filter by creator
				const creator = await vscode.window.showInputBox({
					prompt: 'Enter GitHub username of issue creator',
					placeHolder: 'GitHub username'
				});
				
				if (creator) {
					techDebtIssuesProvider.setFilter({ creator });
				}
			} else if (selectedFilter.assignee) {
				// Filter by assignee
				const assignee = await vscode.window.showInputBox({
					prompt: 'Enter GitHub username of assignee',
					placeHolder: 'GitHub username'
				});
				
				if (assignee) {
					techDebtIssuesProvider.setFilter({ assignee });
				}
			} else {
				// Show all issues
				techDebtIssuesProvider.setFilter({ state: 'all', assignee: undefined, creator: undefined });
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to filter issues: ${error.message}`);
		}
	});
	
	// Register command to show open issues
	const showOpenCommand = vscode.commands.registerCommand('tech-debt-extension.showOpenIssues', () => {
		techDebtIssuesProvider.setFilter({ state: 'open' });
	});
	
	// Register command to show closed issues
	const showClosedCommand = vscode.commands.registerCommand('tech-debt-extension.showClosedIssues', () => {
		techDebtIssuesProvider.setFilter({ state: 'closed' });
	});
	
	// Register command to clear filters
	const clearFiltersCommand = vscode.commands.registerCommand('tech-debt-extension.clearFilters', () => {
		techDebtIssuesProvider.clearFilter();
		vscode.window.showInformationMessage('Issue filters cleared');
	});

	// Register command to edit an issue
	const editIssueCommand = vscode.commands.registerCommand('tech-debt-extension.editIssue', async (item: TechDebtIssueItem) => {
		try {
			// Initialize GitHub API if needed
			await githubApi.initialize();
			
			if (!item) {
				vscode.window.showErrorMessage('No issue selected');
				return;
			}
			
			// Show the edit form panel
			EditIssueFormPanel.createOrShow(
				context.extensionUri,
				githubApi,
				techDebtIssuesProvider,
				item.issue.number,
				item.issue.title,
				item.issue.body || ''
			);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to edit issue: ${error.message}`);
		}
	});
	
	// Register command to close an issue
	const closeIssueCommand = vscode.commands.registerCommand('tech-debt-extension.closeIssue', async (item: TechDebtIssueItem) => {
		try {
			// Initialize GitHub API if needed
			await githubApi.initialize();
			
			if (!item) {
				vscode.window.showErrorMessage('No issue selected');
				return;
			}
			
			// Confirm with the user
			const response = await vscode.window.showWarningMessage(
				`Are you sure you want to close issue #${item.issue.number}: ${item.issue.title}?`,
				{ modal: true },
				'Yes',
				'No'
			);
			
			if (response !== 'Yes') {
				return; // User cancelled
			}
			
			// Show progress indicator
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Closing tech debt issue...',
					cancellable: false
				},
				async () => {
					await githubApi.closeIssue(item.issue.number);
					
					// Show success message
					vscode.window.showInformationMessage(`Tech debt issue #${item.issue.number} closed successfully!`);
					
					// Refresh the tree view
					techDebtIssuesProvider.refresh();
				}
			);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to close issue: ${error.message}`);
		}
	});
	
	// Register command to reopen an issue
	const reopenIssueCommand = vscode.commands.registerCommand('tech-debt-extension.reopenIssue', async (item: TechDebtIssueItem) => {
		try {
			// Initialize GitHub API if needed
			await githubApi.initialize();
			
			if (!item) {
				vscode.window.showErrorMessage('No issue selected');
				return;
			}
			
			// Confirm with the user
			const response = await vscode.window.showWarningMessage(
				`Are you sure you want to reopen issue #${item.issue.number}: ${item.issue.title}?`,
				{ modal: true },
				'Yes',
				'No'
			);
			
			if (response !== 'Yes') {
				return; // User cancelled
			}
			
			// Show progress indicator
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Reopening tech debt issue...',
					cancellable: false
				},
				async () => {
					await githubApi.reopenIssue(item.issue.number);
					
					// Show success message
					vscode.window.showInformationMessage(`Tech debt issue #${item.issue.number} reopened successfully!`);
					
					// Refresh the tree view
					techDebtIssuesProvider.refresh();
				}
			);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to reopen issue: ${error.message}`);
		}
	});
	
	// Add all commands and views to subscriptions
	context.subscriptions.push(
		createIssueCommand,
		viewIssuesCommand,
		refreshCommand,
		commentCommand,
		viewDetailsCommand,
		filterCommand,
		showOpenCommand,
		showClosedCommand,
		clearFiltersCommand,
		editIssueCommand,
		closeIssueCommand,
		reopenIssueCommand,
		treeView
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
