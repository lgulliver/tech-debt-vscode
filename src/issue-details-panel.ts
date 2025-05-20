import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';

/**
 * Manages tech debt issue detail webview panels
 */
export class IssueDetailsPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: IssueDetailsPanel | undefined;

    private static readonly viewType = 'techDebtIssueDetails';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _githubApi: GitHubAPI;

    public static createOrShow(extensionUri: vscode.Uri, issueNumber: number, githubApi: GitHubAPI) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (IssueDetailsPanel.currentPanel) {
            IssueDetailsPanel.currentPanel._panel.reveal(column);
            IssueDetailsPanel.currentPanel.update(issueNumber);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            IssueDetailsPanel.viewType,
            'Tech Debt Issue Details',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,
                
                // Restrict the webview to only load resources from our extension's directory
                localResourceRoots: [extensionUri]
            }
        );

        IssueDetailsPanel.currentPanel = new IssueDetailsPanel(panel, extensionUri, githubApi);
        IssueDetailsPanel.currentPanel.update(issueNumber);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, githubApi: GitHubAPI) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._githubApi = githubApi;

        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview('Loading issue details...');

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openInBrowser':
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                        return;
                    case 'addComment':
                        vscode.commands.executeCommand('tech-debt-extension.commentOnIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle }
                        });
                        return;
                    case 'editIssue':
                        vscode.commands.executeCommand('tech-debt-extension.editIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle, state: message.issueState }
                        });
                        return;
                    case 'closeIssue':
                        vscode.commands.executeCommand('tech-debt-extension.closeIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle }
                        });
                        this.dispose(); // Close the panel as the issue will be updated
                        return;
                    case 'reopenIssue':
                        vscode.commands.executeCommand('tech-debt-extension.reopenIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle }
                        });
                        this.dispose(); // Close the panel as the issue will be updated
                        return;
                    case 'refresh':
                        this.update(message.issueNumber);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public async update(issueNumber: number) {
        // Show loading message
        this._panel.webview.html = this._getHtmlForWebview('Loading issue details...');
        
        try {
            // Get issue details
            await this._githubApi.initialize();
            const issue = await this._githubApi.getIssueDetails(issueNumber);
            
            // Update title
            this._panel.title = `Issue #${issue.number}: ${issue.title}`;
            
            // Update content
            this._panel.webview.html = this._getHtmlForWebview('', issue);
        } catch (error) {
            this._panel.webview.html = this._getHtmlForWebview(`Error loading issue: ${error}`);
        }
    }

    public dispose() {
        IssueDetailsPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(message: string, issue?: any) {
        if (message && !issue) {
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tech Debt Issue</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                    }
                    .message {
                        padding: 20px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="message">${message}</div>
            </body>
            </html>`;
        }

        const createdDate = new Date(issue.created_at).toLocaleString();
        const updatedDate = new Date(issue.updated_at).toLocaleString();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tech Debt Issue #${issue.number}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                }
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 10px;
                    color: var(--vscode-editor-foreground);
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .issue-number {
                    color: var(--vscode-descriptionForeground);
                    font-size: 1.2em;
                }
                .meta {
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 20px;
                    font-size: 0.9em;
                }
                .label {
                    display: inline-block;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 8px;
                    border-radius: 4px;
                    margin-right: 5px;
                    font-size: 0.85em;
                }
                .body {
                    margin-top: 20px;
                    padding: 10px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border-radius: 4px;
                    line-height: 1.5;
                }
                .btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                    margin-right: 10px;
                }
                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .actions {
                    margin-top: 20px;
                    display: flex;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${issue.title}</h1>
                <span class="issue-number">#${issue.number}</span>
            </div>
            <div class="meta">
                <div>Created by <strong>${issue.user.login}</strong> on ${createdDate}</div>
                <div>Last updated on ${updatedDate}</div>
                <div style="margin-top: 10px;">
                    ${issue.labels.map((label: any) => `<span class="label">${label.name}</span>`).join('')}
                </div>
            </div>
            <div class="body">
                ${issue.body ? issue.body.replace(/\n/g, '<br>') : '<em>No description provided</em>'}
            </div>
            <div class="actions">
                <button class="btn" id="openInBrowser">Open in Browser</button>
                <button class="btn" id="addComment">Add Comment</button>
                <button class="btn" id="editIssue">Edit Issue</button>
                ${issue.state === 'open' ? 
                    '<button class="btn" id="closeIssue">Close Issue</button>' : 
                    '<button class="btn" id="reopenIssue">Reopen Issue</button>'}
                <button class="btn" id="refresh">Refresh</button>
            </div>

            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('openInBrowser').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'openInBrowser',
                            url: '${issue.html_url}'
                        });
                    });
                    
                    document.getElementById('addComment').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'addComment',
                            issueNumber: ${issue.number},
                            issueTitle: '${issue.title.replace(/'/g, "\\'")}'
                        });
                    });
                    
                    document.getElementById('editIssue').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'editIssue',
                            issueNumber: ${issue.number},
                            issueTitle: '${issue.title.replace(/'/g, "\\'")}',
                            issueState: '${issue.state}'
                        });
                    });

                    ${issue.state === 'open' ? `
                    document.getElementById('closeIssue').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'closeIssue',
                            issueNumber: ${issue.number},
                            issueTitle: '${issue.title.replace(/'/g, "\\'")}',
                        });
                    });
                    ` : `
                    document.getElementById('reopenIssue').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'reopenIssue',
                            issueNumber: ${issue.number},
                            issueTitle: '${issue.title.replace(/'/g, "\\'")}',
                        });
                    });
                    `}
                    
                    document.getElementById('refresh').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'refresh',
                            issueNumber: ${issue.number}
                        });
                    });
                }())
            </script>
        </body>
        </html>`;
    }
}
