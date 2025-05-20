import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';

/**
 * Manages tech debt issue creation form webview panel
 */
export class IssueFormPanel {
    /**
     * Track the current panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: IssueFormPanel | undefined;

    private static readonly viewType = 'techDebtIssueForm';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _githubApi: GitHubAPI;
    private _techDebtIssuesProvider: any;

    public static createOrShow(
        extensionUri: vscode.Uri, 
        githubApi: GitHubAPI, 
        techDebtIssuesProvider: any,
        initialTitle: string = '',
        initialContent: string = ''
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (IssueFormPanel.currentPanel) {
            IssueFormPanel.currentPanel._panel.reveal(column);
            IssueFormPanel.currentPanel.updateForm(initialTitle, initialContent);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            IssueFormPanel.viewType,
            'Create Tech Debt Issue',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,
                
                // Restrict the webview to only load resources from our extension's directory
                localResourceRoots: [extensionUri],

                // Retain context when hidden
                retainContextWhenHidden: true
            }
        );

        IssueFormPanel.currentPanel = new IssueFormPanel(panel, extensionUri, githubApi, techDebtIssuesProvider);
        IssueFormPanel.currentPanel.updateForm(initialTitle, initialContent);
    }

    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri, 
        githubApi: GitHubAPI,
        techDebtIssuesProvider: any
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._githubApi = githubApi;
        this._techDebtIssuesProvider = techDebtIssuesProvider;

        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview('', '');

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'createIssue':
                        await this.createIssue(message.title, message.description);
                        return;
                    case 'checkSimilarIssues':
                        await this.checkSimilarIssues(message.title);
                        return;
                    case 'cancel':
                        this.dispose();
                        return;
                    case 'viewIssue':
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Check for similar issues and send them to the webview
     */
    private async checkSimilarIssues(title: string): Promise<void> {
        try {
            // Validate
            if (!title.trim()) {
                return;
            }

            // Search for similar issues
            const similarIssues = await this._githubApi.searchSimilarIssues(title);
            
            // Send results to the webview
            this._panel.webview.postMessage({ 
                command: 'similarIssuesResult', 
                issues: similarIssues 
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to check similar issues: ${error.message}`);
        }
    }

    /**
     * Create a new issue with the provided title and description
     */
    private async createIssue(title: string, description: string): Promise<void> {
        try {
            // Validate
            if (!title.trim()) {
                this._panel.webview.postMessage({ 
                    command: 'validationError', 
                    fieldName: 'title',
                    message: 'Title is required'
                });
                return;
            }

            // Show progress indicator
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Creating tech debt issue...',
                    cancellable: false
                },
                async () => {
                    const issue = await this._githubApi.createIssue(title, description);
                    
                    // Show success message with link to the created issue
                    const viewAction = 'View Issue';
                    const result = await vscode.window.showInformationMessage(
                        `Tech debt issue #${issue.number} created successfully!`,
                        viewAction
                    );
                    
                    if (result === viewAction) {
                        vscode.env.openExternal(vscode.Uri.parse(issue.url));
                    }
                    
                    // Refresh the tree view
                    this._techDebtIssuesProvider.refresh();
                    
                    // Close the form panel
                    this.dispose();
                }
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create tech debt issue: ${error.message}`);
        }
    }

    /**
     * Update the form with new values
     */
    public updateForm(title: string = '', description: string = '') {
        this._panel.webview.html = this._getHtmlForWebview(title, description);
    }

    public dispose() {
        IssueFormPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Generate the HTML for the webview
     */
    private _getHtmlForWebview(title: string, description: string) {
        // Check if there's selected text in the active editor
        let selectedCodeBlock = '';
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && !activeEditor.selection.isEmpty) {
            const selectedText = activeEditor.document.getText(activeEditor.selection);
            const fileName = activeEditor.document.fileName.split('/').pop() || '';
            selectedCodeBlock = `## Selected Code (from ${fileName})\n\`\`\`\n${selectedText}\n\`\`\`\n\n`;
            
            // If no description was provided, add the selected code
            if (!description) {
                description = selectedCodeBlock;
            }
        }

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create Tech Debt Issue</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    max-width: 900px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 20px;
                    color: var(--vscode-editor-foreground);
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                input, textarea {
                    width: 100%;
                    padding: 8px;
                    margin-bottom: 15px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }
                input:focus, textarea:focus {
                    outline: 2px solid var(--vscode-focusBorder);
                    border-color: transparent;
                }
                textarea {
                    min-height: 300px;
                    resize: vertical;
                    font-family: var(--vscode-editor-font-family);
                    line-height: 1.5;
                }
                .error {
                    color: var(--vscode-errorForeground);
                    font-size: 0.9em;
                    margin-top: -10px;
                    margin-bottom: 10px;
                    display: none;
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
                .btn-secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .btn-secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .actions {
                    margin-top: 20px;
                    display: flex;
                }
                .similar-issues {
                    margin-top: 15px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    display: none;
                }
                .similar-issues-header {
                    padding: 8px 10px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    font-weight: bold;
                    border-bottom: 1px solid var(--vscode-input-border);
                }
                .similar-issue-item {
                    padding: 8px 10px;
                    border-bottom: 1px solid var(--vscode-input-border);
                    cursor: pointer;
                }
                .similar-issue-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .similar-issue-item:last-child {
                    border-bottom: none;
                }
                .similar-issue-title {
                    font-weight: bold;
                }
                .similar-issue-number {
                    color: var(--vscode-descriptionForeground);
                    margin-left: 5px;
                }
                .similar-issue-body {
                    margin-top: 5px;
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .description-help {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                }
                .template-btn {
                    padding: 3px 8px;
                    margin-bottom: 10px;
                    font-size: 0.9em;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                .template-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
            </style>
        </head>
        <body>
            <h1>Create Tech Debt Issue</h1>
            
            <div>
                <label for="title">Title</label>
                <input 
                    type="text" 
                    id="title" 
                    placeholder="Brief summary of the tech debt issue" 
                    value="${this._escapeHtml(title)}"
                    autofocus
                >
                <div id="title-error" class="error">Please enter a title</div>
                
                <div id="similar-issues" class="similar-issues">
                    <div class="similar-issues-header">Similar Issues</div>
                    <div id="similar-issues-list"></div>
                </div>
                
                <label for="description">Description</label>
                <div class="description-help">Provide details about the tech debt. What is it? Why is it a problem? How should it be fixed?</div>
                <textarea 
                    id="description" 
                    placeholder="Detailed description of the tech debt issue"
                >${this._escapeHtml(description)}</textarea>
            </div>
            
            <div class="actions">
                <button id="create-btn" class="btn">Create Issue</button>
                <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
            </div>

            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    let timeoutId;
                    
                    // Elements
                    const titleInput = document.getElementById('title');
                    const titleError = document.getElementById('title-error');
                    const descriptionInput = document.getElementById('description');
                    const similarIssuesContainer = document.getElementById('similar-issues');
                    const similarIssuesList = document.getElementById('similar-issues-list');
                    const createBtn = document.getElementById('create-btn');
                    const cancelBtn = document.getElementById('cancel-btn');
                    
                    // Listen for changes to title for similar issues check
                    titleInput.addEventListener('input', (e) => {
                        // Clear previous timeout
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        
                        // Set a new timeout to check for similar issues after typing stops
                        timeoutId = setTimeout(() => {
                            const title = titleInput.value.trim();
                            if (title) {
                                // Hide any previous error
                                titleError.style.display = 'none';
                                
                                // Send message to check for similar issues
                                vscode.postMessage({
                                    command: 'checkSimilarIssues',
                                    title: title
                                });
                            } else {
                                // Hide similar issues if title is empty
                                similarIssuesContainer.style.display = 'none';
                            }
                        }, 500); // Wait 500ms after typing stops
                    });
                    
                    // Handle create button click
                    createBtn.addEventListener('click', () => {
                        const title = titleInput.value.trim();
                        const description = descriptionInput.value.trim();
                        
                        // Validate title
                        if (!title) {
                            titleError.style.display = 'block';
                            titleInput.focus();
                            return;
                        }
                        
                        // Send message to create issue
                        vscode.postMessage({
                            command: 'createIssue',
                            title: title,
                            description: description
                        });
                    });
                    
                    // Handle cancel button click
                    cancelBtn.addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'cancel'
                        });
                    });
                    
                    
                    // Helper function to insert text at cursor position
                    function insertTextAtCursor(textarea, text) {
                        const startPos = textarea.selectionStart;
                        const endPos = textarea.selectionEnd;
                        
                        textarea.value = 
                            textarea.value.substring(0, startPos) + 
                            text + 
                            textarea.value.substring(endPos);
                        
                        // Set cursor position after inserted text
                        textarea.selectionStart = textarea.selectionEnd = startPos + text.length;
                        textarea.focus();
                    }
                    
                    // Handle messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.command) {
                            case 'validationError':
                                // Show validation error
                                if (message.fieldName === 'title') {
                                    titleError.textContent = message.message;
                                    titleError.style.display = 'block';
                                    titleInput.focus();
                                }
                                break;
                                
                            case 'similarIssuesResult':
                                // Display similar issues if found
                                if (message.issues && message.issues.length > 0) {
                                    similarIssuesList.innerHTML = '';
                                    
                                    message.issues.forEach(issue => {
                                        const div = document.createElement('div');
                                        div.className = 'similar-issue-item';
                                        
                                        const titleSpan = document.createElement('span');
                                        titleSpan.className = 'similar-issue-title';
                                        titleSpan.textContent = issue.title;
                                        
                                        const numberSpan = document.createElement('span');
                                        numberSpan.className = 'similar-issue-number';
                                        numberSpan.textContent = '#' + issue.number;
                                        
                                        const bodyDiv = document.createElement('div');
                                        bodyDiv.className = 'similar-issue-body';
                                        bodyDiv.textContent = issue.body ? 
                                            issue.body.substring(0, 100) + (issue.body.length > 100 ? '...' : '') : 
                                            'No description';
                                        
                                        div.appendChild(titleSpan);
                                        div.appendChild(numberSpan);
                                        div.appendChild(bodyDiv);
                                        
                                        // Add click handler to view the issue
                                        div.addEventListener('click', () => {
                                            vscode.postMessage({
                                                command: 'viewIssue',
                                                url: issue.url
                                            });
                                        });
                                        
                                        similarIssuesList.appendChild(div);
                                    });
                                    
                                    similarIssuesContainer.style.display = 'block';
                                } else {
                                    similarIssuesContainer.style.display = 'none';
                                }
                                break;
                        }
                    });
                }())
            </script>
        </body>
        </html>`;
    }

    /**
     * Helper method to escape HTML special characters
     */
    private _escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
