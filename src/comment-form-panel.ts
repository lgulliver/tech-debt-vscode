import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';
import { StringUtils } from './utils/string-utils';

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
        initialContent: string = '',
        techDebtIssuesProvider: any = null
    ) {
        console.log(`CommentFormPanel: createOrShow called for issue #${issueNumber}: ${issueTitle}`);
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (CommentFormPanel.currentPanel) {
            console.log('CommentFormPanel: Revealing existing panel');
            CommentFormPanel.currentPanel._panel.reveal(column);
            CommentFormPanel.currentPanel.updateForm(issueNumber, issueTitle, initialContent);
            return;
        }

        console.log('CommentFormPanel: Creating new webview panel');
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

        console.log('CommentFormPanel: Creating CommentFormPanel instance');
        CommentFormPanel.currentPanel = new CommentFormPanel(panel, extensionUri, githubApi, issueNumber, issueTitle, techDebtIssuesProvider);
        console.log('CommentFormPanel: Updating form with initial data');
        CommentFormPanel.currentPanel.updateForm(issueNumber, issueTitle, initialContent);
        console.log('CommentFormPanel: Panel creation complete');
    }

    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri, 
        githubApi: GitHubAPI,
        issueNumber: number,
        issueTitle: string,
        private readonly _techDebtIssuesProvider: any = null
    ) {
        console.log(`CommentFormPanel: Constructor called for issue #${issueNumber}`);
        
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._githubApi = githubApi;
        this._issueNumber = issueNumber;
        this._issueTitle = issueTitle;

        console.log('CommentFormPanel: Setting initial webview HTML');
        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview('');

        console.log('CommentFormPanel: Setting up event listeners');
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('CommentFormPanel: Received message from webview:', message);
                switch (message.command) {
                    case 'postComment':
                        console.log(`CommentFormPanel: Processing postComment command with comment: "${message.comment}"`);
                        await this.postComment(message.comment);
                        return;
                    case 'cancel':
                        console.log('CommentFormPanel: Processing cancel command');
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
        
        console.log('CommentFormPanel: Constructor completed');
    }

    /**
     * Post a comment to the GitHub issue
     */
    private async postComment(comment: string): Promise<void> {
        try {
            console.log(`CommentFormPanel: Attempting to post comment to issue #${this._issueNumber}`);
            console.log(`Comment content: "${comment}"`);
            
            // Validate
            if (!comment.trim()) {
                console.log('CommentFormPanel: Comment validation failed - empty comment');
                this._panel.webview.postMessage({ 
                    command: 'validationError', 
                    message: 'Comment cannot be empty'
                });
                return;
            }

            // Ensure GitHub API is initialized before posting comment
            console.log('CommentFormPanel: Ensuring GitHub API is initialized...');
            await this._githubApi.initialize();
            console.log('CommentFormPanel: GitHub API initialization confirmed');

            // Show progress indicator
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Posting comment...',
                    cancellable: false
                },
                async () => {
                    console.log('CommentFormPanel: Starting comment posting process...');
                    const commentResult = await this._githubApi.addCommentToIssue(this._issueNumber, comment);
                    console.log('CommentFormPanel: Comment posted successfully, result:', commentResult);
                    
                    // Show success message with link to the comment
                    const viewAction = 'View Comment';
                    const result = await vscode.window.showInformationMessage(
                        `Comment added to issue #${this._issueNumber} successfully!`,
                        viewAction
                    );
                    
                    if (result === viewAction) {
                        vscode.env.openExternal(vscode.Uri.parse(commentResult.url));
                    }
                    
                    // Remove duplicate refresh calls
                    console.log('CommentFormPanel: Refreshing tree view...');
                    await new Promise(resolve => setTimeout(resolve, 800));
                    if (this._techDebtIssuesProvider) {
                        this._techDebtIssuesProvider.refresh();
                    }
                    
                    // Close the form panel
                    console.log('CommentFormPanel: Disposing panel...');
                    this.dispose();
                }
            );
        } catch (error: any) {
            console.error('CommentFormPanel: Error posting comment:', error);
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
                    console.log('Webview: Script starting...');
                    
                    try {
                        const vscode = acquireVsCodeApi();
                        console.log('Webview: VS Code API acquired successfully');
                        
                        // Elements
                        console.log('Webview: Finding DOM elements...');
                        const commentInput = document.getElementById('comment');
                        const errorMessage = document.getElementById('error-message');
                        const postBtn = document.getElementById('post-btn');
                        const cancelBtn = document.getElementById('cancel-btn');
                        const templateCodeBtn = document.getElementById('template-code');
                        const templateQuoteBtn = document.getElementById('template-quote');
                        
                        console.log('Webview: Elements found:', {
                            commentInput: !!commentInput,
                            errorMessage: !!errorMessage,
                            postBtn: !!postBtn,
                            cancelBtn: !!cancelBtn
                        });
                        
                        if (!postBtn) {
                            console.error('Webview: Post button not found!');
                            return;
                        }
                        
                        // Handle post button click
                        postBtn.addEventListener('click', () => {
                            console.log('Webview: Post button clicked');
                            const comment = commentInput.value.trim();
                            console.log('Webview: Comment content:', comment);
                            
                            // Validate
                            if (!comment) {
                                console.log('Webview: Comment validation failed - empty comment');
                                errorMessage.style.display = 'block';
                                commentInput.focus();
                                return;
                            }
                            
                            console.log('Webview: Sending postComment message to extension');
                            // Send message to post comment
                            vscode.postMessage({
                                command: 'postComment',
                                comment: comment
                            });
                            console.log('Webview: postMessage sent successfully');
                        });
                        console.log('Webview: Post button event listener added');
                        
                        // Handle cancel button click
                        cancelBtn.addEventListener('click', () => {
                            console.log('Webview: Cancel button clicked');
                            vscode.postMessage({
                                command: 'cancel'
                            });
                        });
                        console.log('Webview: Cancel button event listener added');
                        
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
                            console.log('Webview: Received message from extension:', event.data);
                            const message = event.data;
                            
                            switch (message.command) {
                                case 'validationError':
                                    console.log('Webview: Showing validation error:', message.message);
                                    // Show validation error
                                    errorMessage.textContent = message.message;
                                    errorMessage.style.display = 'block';
                                    commentInput.focus();
                                    break;
                            }
                        });
                        
                        // Set focus to comment textarea
                        console.log('Webview: Setting focus to comment input');
                        commentInput.focus();
                        console.log('Webview: Initialization completed successfully');
                        
                    } catch (error) {
                        console.error('Webview: Error during initialization:', error);
                    }
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
