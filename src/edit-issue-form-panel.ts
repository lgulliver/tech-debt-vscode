import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';
import { StringUtils } from './utils/string-utils';

/**
 * Manages tech debt issue editing form webview panel
 */
export class EditIssueFormPanel {
    /**
     * Track the current panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: EditIssueFormPanel | undefined;

    private static readonly viewType = 'techDebtIssueEditForm';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _githubApi: GitHubAPI;
    private _issueNumber: number;
    private _techDebtIssuesProvider: any;

    public static createOrShow(
        extensionUri: vscode.Uri, 
        githubApi: GitHubAPI, 
        techDebtIssuesProvider: any,
        issueNumber: number,
        title: string,
        body: string
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (EditIssueFormPanel.currentPanel) {
            EditIssueFormPanel.currentPanel._panel.reveal(column);
            EditIssueFormPanel.currentPanel.updateForm(issueNumber, title, body);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            EditIssueFormPanel.viewType,
            `Edit Issue #${issueNumber}`,
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

        EditIssueFormPanel.currentPanel = new EditIssueFormPanel(panel, extensionUri, githubApi, techDebtIssuesProvider, issueNumber);
        EditIssueFormPanel.currentPanel.updateForm(issueNumber, title, body);
    }

    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri, 
        githubApi: GitHubAPI,
        techDebtIssuesProvider: any,
        issueNumber: number
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._githubApi = githubApi;
        this._techDebtIssuesProvider = techDebtIssuesProvider;
        this._issueNumber = issueNumber;

        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview('', '');

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'saveChanges':
                        await this.saveChanges(message.title, message.body);
                        return;
                    case 'cancel':
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Save changes to an issue
     */
    private async saveChanges(title: string, body: string): Promise<void> {
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
                    title: 'Updating tech debt issue...',
                    cancellable: false
                },
                async () => {
                    await this._githubApi.editIssue(this._issueNumber, title, body);
                    
                    // Show success message
                    vscode.window.showInformationMessage(`Tech debt issue #${this._issueNumber} updated successfully!`);
                    
                    // Refresh the tree view
                    this._techDebtIssuesProvider.refresh();
                    
                    // Close the form panel
                    this.dispose();
                }
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to update issue: ${error.message}`);
        }
    }

    /**
     * Update the form with new values
     */
    public updateForm(issueNumber: number, title: string, body: string) {
        this._issueNumber = issueNumber;
        this._panel.title = `Edit Issue #${issueNumber}`;
        this._panel.webview.html = this._getHtmlForWebview(title, body);
    }

    public dispose() {
        EditIssueFormPanel.currentPanel = undefined;

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
    private _getHtmlForWebview(title: string, body: string) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Edit Issue #${this._issueNumber}</title>
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
            <h1>Edit Issue #${this._issueNumber}</h1>
            
            <div>
                <label for="title">Title</label>
                <input 
                    type="text" 
                    id="title" 
                    placeholder="Issue title" 
                    value="${this._escapeHtml(title)}"
                    autofocus
                >
                <div id="title-error" class="error">Please enter a title</div>
                
                <label for="body">Description</label>
                <div class="description-help">Provide details about the tech debt. Markdown formatting is supported.</div>
                <div>
                    <button id="template-code" class="template-btn">Insert Code Block</button>
                    <button id="template-quote" class="template-btn">Insert Quote</button>
                </div>
                <textarea 
                    id="body" 
                    placeholder="Detailed description of the tech debt issue"
                >${this._escapeHtml(body)}</textarea>
            </div>
            
            <div class="actions">
                <button id="save-btn" class="btn">Save Changes</button>
                <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
            </div>

            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    // Elements
                    const titleInput = document.getElementById('title');
                    const titleError = document.getElementById('title-error');
                    const bodyInput = document.getElementById('body');
                    const saveBtn = document.getElementById('save-btn');
                    const cancelBtn = document.getElementById('cancel-btn');
                    const templateCodeBtn = document.getElementById('template-code');
                    const templateQuoteBtn = document.getElementById('template-quote');
                    
                    // Handle save button click
                    saveBtn.addEventListener('click', () => {
                        const title = titleInput.value.trim();
                        const body = bodyInput.value;
                        
                        // Validate title
                        if (!title) {
                            titleError.style.display = 'block';
                            titleInput.focus();
                            return;
                        }
                        
                        // Send message to save changes
                        vscode.postMessage({
                            command: 'saveChanges',
                            title: title,
                            body: body
                        });
                    });
                    
                    // Handle cancel button click
                    cancelBtn.addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'cancel'
                        });
                    });
                    
                    // Handle code template button click
                    templateCodeBtn.addEventListener('click', () => {
                        const template = '\`\`\`\n// Your code here\n\`\`\`\n';
                        insertTextAtCursor(bodyInput, template);
                    });
                    
                    // Handle quote template button click
                    templateQuoteBtn.addEventListener('click', () => {
                        const template = '> Your quote here\n\n';
                        insertTextAtCursor(bodyInput, template);
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
                        }
                    });
                }())
            </script>
        </body>
        </html>`;
    }

    /**
     * Helper method to escape HTML special characters
     * @deprecated Use StringUtils.escapeHtml instead
     */
    private _escapeHtml(text: string): string {
        return StringUtils.escapeHtml(text);
    }
}
