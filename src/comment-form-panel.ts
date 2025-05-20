import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';

/**
 * Manages tech debt issue comment form webview panel
 */
export class CommentFormPanel {
    /**
     * Track the current panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: CommentFormPanel | undefined;

    private static readonly viewType = 'techDebtIssueComment';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _githubApi: GitHubAPI;
    private _issueNumber: number;
    private _issueTitle: string;

    public static createOrShow(
        extensionUri: vscode.Uri, 
        githubApi: GitHubAPI,
        issueNumber: number,
        issueTitle: string,
        initialContent: string = ''
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (CommentFormPanel.currentPanel) {
            CommentFormPanel.currentPanel._panel.reveal(column);
            CommentFormPanel.currentPanel.updateForm(issueNumber, issueTitle, initialContent);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            CommentFormPanel.viewType,
            `Comment on Issue #${issueNumber}`,
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

        CommentFormPanel.currentPanel = new CommentFormPanel(panel, extensionUri, githubApi, issueNumber, issueTitle);
        CommentFormPanel.currentPanel.updateForm(issueNumber, issueTitle, initialContent);
    }

    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri, 
        githubApi: GitHubAPI,
        issueNumber: number,
        issueTitle: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._githubApi = githubApi;
        this._issueNumber = issueNumber;
        this._issueTitle = issueTitle;

        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview('');

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'postComment':
                        await this.postComment(message.comment);
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
     * Post a comment to the GitHub issue
     */
    private async postComment(comment: string): Promise<void> {
        try {
            // Validate
            if (!comment.trim()) {
                this._panel.webview.postMessage({ 
                    command: 'validationError', 
                    message: 'Comment cannot be empty'
                });
                return;
            }

            // Show progress indicator
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Posting comment...',
                    cancellable: false
                },
                async () => {
                    const commentResult = await this._githubApi.addCommentToIssue(this._issueNumber, comment);
                    
                    // Show success message with link to the comment
                    const viewAction = 'View Comment';
                    const result = await vscode.window.showInformationMessage(
                        `Comment added to issue #${this._issueNumber} successfully!`,
                        viewAction
                    );
                    
                    if (result === viewAction) {
                        vscode.env.openExternal(vscode.Uri.parse(commentResult.url));
                    }
                    
                    // Close the form panel
                    this.dispose();
                }
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to post comment: ${error.message}`);
        }
    }

    /**
     * Update the form with new values
     */
    public updateForm(issueNumber: number, issueTitle: string, comment: string = '') {
        this._issueNumber = issueNumber;
        this._issueTitle = issueTitle;
        this._panel.title = `Comment on Issue #${issueNumber}`;
        this._panel.webview.html = this._getHtmlForWebview(comment);
    }

    public dispose() {
        CommentFormPanel.currentPanel = undefined;

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
    private _getHtmlForWebview(comment: string) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Comment on Issue #${this._issueNumber}</title>
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
                h2 {
                    font-size: 1.2em;
                    margin-bottom: 10px;
                    color: var(--vscode-descriptionForeground);
                }
                textarea {
                    width: 100%;
                    padding: 8px;
                    margin-bottom: 15px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                    min-height: 200px;
                    resize: vertical;
                    font-family: var(--vscode-editor-font-family);
                    line-height: 1.5;
                }
                textarea:focus {
                    outline: 2px solid var(--vscode-focusBorder);
                    border-color: transparent;
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
            <h1>Add Comment</h1>
            <h2>Issue #${this._issueNumber}: ${this._escapeHtml(this._issueTitle)}</h2>
            
            <div>
                <div class="description-help">Enter your comment. Markdown formatting is supported.</div>
                <div>
                    <button id="template-code" class="template-btn">Insert Code Block</button>
                    <button id="template-quote" class="template-btn">Insert Quote</button>
                </div>
                <textarea 
                    id="comment" 
                    placeholder="Enter your comment here..."
                    autofocus
                >${this._escapeHtml(comment)}</textarea>
                <div id="error-message" class="error">Please enter a comment</div>
            </div>
            
            <div class="actions">
                <button id="post-btn" class="btn">Post Comment</button>
                <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
            </div>

            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    // Elements
                    const commentInput = document.getElementById('comment');
                    const errorMessage = document.getElementById('error-message');
                    const postBtn = document.getElementById('post-btn');
                    const cancelBtn = document.getElementById('cancel-btn');
                    const templateCodeBtn = document.getElementById('template-code');
                    const templateQuoteBtn = document.getElementById('template-quote');
                    
                    // Handle post button click
                    postBtn.addEventListener('click', () => {
                        const comment = commentInput.value.trim();
                        
                        // Validate
                        if (!comment) {
                            errorMessage.style.display = 'block';
                            commentInput.focus();
                            return;
                        }
                        
                        // Send message to post comment
                        vscode.postMessage({
                            command: 'postComment',
                            comment: comment
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
                        insertTextAtCursor(commentInput, template);
                    });
                    
                    // Handle quote template button click
                    templateQuoteBtn.addEventListener('click', () => {
                        const template = '> Your quote here\n\n';
                        insertTextAtCursor(commentInput, template);
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
                                errorMessage.textContent = message.message;
                                errorMessage.style.display = 'block';
                                commentInput.focus();
                                break;
                        }
                    });
                    
                    // Set focus to comment textarea
                    commentInput.focus();
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
