import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';
import { StringUtils } from './utils/string-utils';

type IssueLabel = { name: string; color?: string };
type IssueAssignee = { login: string };
type IssueMilestone = { title: string } | null;

interface IssueDetails {
    number: number;
    title: string;
    body?: string | null;
    html_url: string;
    state: 'open' | 'closed';
    user?: { login?: string | null } | null;
    created_at?: string;
    updated_at?: string;
    labels?: IssueLabel[];
    assignees?: IssueAssignee[];
    milestone?: IssueMilestone;
    comments?: number;
}

/**
 * Manages tech debt issue detail webview panels.
 */
export class IssueDetailsPanel {
    public static currentPanel: IssueDetailsPanel | undefined;

    private static readonly viewType = 'techDebtIssueDetails';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _githubApi: GitHubAPI;

    public static createOrShow(extensionUri: vscode.Uri, issueNumber: number, githubApi: GitHubAPI) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (IssueDetailsPanel.currentPanel) {
            IssueDetailsPanel.currentPanel._panel.reveal(column);
            void IssueDetailsPanel.currentPanel.update(issueNumber);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            IssueDetailsPanel.viewType,
            'Tech Debt Issue Details',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        IssueDetailsPanel.currentPanel = new IssueDetailsPanel(panel, extensionUri, githubApi);
        void IssueDetailsPanel.currentPanel.update(issueNumber);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, githubApi: GitHubAPI) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._githubApi = githubApi;

        this._panel.webview.html = this._renderLoadingState('Loading issue details...');

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openInBrowser':
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                        return;
                    case 'addComment':
                        void vscode.commands.executeCommand('tech-debt-extension.commentOnIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle }
                        });
                        return;
                    case 'editIssue':
                        void vscode.commands.executeCommand('tech-debt-extension.editIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle, state: message.issueState }
                        });
                        return;
                    case 'closeIssue':
                        void vscode.commands.executeCommand('tech-debt-extension.closeIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle }
                        });
                        this.dispose();
                        return;
                    case 'reopenIssue':
                        void vscode.commands.executeCommand('tech-debt-extension.reopenIssue', {
                            issue: { number: message.issueNumber, title: message.issueTitle }
                        });
                        this.dispose();
                        return;
                    case 'refresh':
                        void this.update(message.issueNumber);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public async update(issueNumber: number) {
        this._panel.webview.html = this._renderLoadingState('Loading issue details...');

        try {
            await this._githubApi.initialize();
            const issue = await this._githubApi.getIssueDetails(issueNumber);

            this._panel.title = `Issue #${issue.number}: ${StringUtils.truncate(issue.title || 'Untitled issue', 80)}`;
            this._panel.webview.html = this._getHtmlForWebview('', issue);
        } catch (error: any) {
            this._panel.webview.html = this._renderErrorState(`Error loading issue: ${error?.message || error}`);
        }
    }

    public dispose() {
        IssueDetailsPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            disposable?.dispose();
        }
    }

    private _getHtmlForWebview(message: string, issue?: IssueDetails): string {
        if (!issue) {
            return this._renderStatusPage(message);
        }

        const createdDate = this._formatDate(issue.created_at);
        const updatedDate = this._formatDate(issue.updated_at);
        const labels = issue.labels ?? [];
        const assignees = issue.assignees ?? [];
        const milestone = issue.milestone?.title?.trim();
        const commentCount = typeof issue.comments === 'number' ? issue.comments : 0;
        const issueData = this._serializeIssue(issue);

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
                    margin: 0;
                    padding: 24px;
                    max-width: 980px;
                }
                .page {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    align-items: flex-start;
                }
                h1 {
                    font-size: 1.5em;
                    margin: 0;
                    line-height: 1.3;
                    overflow-wrap: anywhere;
                }
                .number {
                    color: var(--vscode-descriptionForeground);
                    white-space: nowrap;
                }
                .card {
                    background: var(--vscode-editor-inactiveSelectionBackground);
                    border-radius: 8px;
                    padding: 16px;
                }
                .meta-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 12px;
                    margin-top: 12px;
                }
                .meta-item {
                    padding: 10px 12px;
                    border-radius: 6px;
                    background: color-mix(in srgb, var(--vscode-editor-background) 82%, transparent);
                }
                .meta-label {
                    display: block;
                    margin-bottom: 4px;
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.85em;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .meta-value {
                    overflow-wrap: anywhere;
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    border-radius: 999px;
                    padding: 4px 10px;
                    font-size: 0.85em;
                    font-weight: 600;
                    white-space: nowrap;
                }
                .badge-open {
                    background: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                }
                .badge-closed {
                    background: var(--vscode-errorForeground);
                    color: var(--vscode-editor-background);
                }
                .labels, .people {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .label {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    padding: 4px 10px;
                    font-size: 0.85em;
                    font-weight: 600;
                    color: #fff;
                    overflow-wrap: anywhere;
                }
                .label-empty {
                    color: var(--vscode-descriptionForeground);
                }
                .body {
                    white-space: pre-wrap;
                    line-height: 1.55;
                }
                .body-empty {
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }
                .actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .status-page {
                    display: grid;
                    place-items: center;
                    min-height: 40vh;
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div>
                        <h1>${this._escapeHtml(issue.title)}</h1>
                        <div class="number">#${issue.number}</div>
                    </div>
                    <span class="badge ${issue.state === 'open' ? 'badge-open' : 'badge-closed'}">
                        ${issue.state === 'open' ? 'Open' : 'Closed'}
                    </span>
                </div>

                <div class="card">
                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Author</span>
                            <span class="meta-value">${this._escapeHtml(issue.user?.login || 'Unknown')}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Created</span>
                            <span class="meta-value">${this._escapeHtml(createdDate)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Updated</span>
                            <span class="meta-value">${this._escapeHtml(updatedDate)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Comments</span>
                            <span class="meta-value">${commentCount}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Milestone</span>
                            <span class="meta-value">${this._escapeHtml(milestone || 'None')}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Assignees</span>
                            <div class="people">
                                ${assignees.length > 0
                                    ? assignees.map(assignee => `<span>${this._escapeHtml(assignee.login)}</span>`).join('')
                                    : '<span class="label-empty">None</span>'}
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 16px;">
                        <div class="meta-label">Labels</div>
                        <div class="labels">
                            ${labels.length > 0
                                ? labels.map(label => {
                                    const safeColor = this._escapeLabelColor(label.color);
                                    return `<span class="label" style="background-color: #${safeColor};">${this._escapeHtml(label.name)}</span>`;
                                }).join('')
                                : '<span class="label-empty">No labels</span>'}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="meta-label">Description</div>
                    <div class="body">
                        ${issue.body ? this._escapeHtml(issue.body) : '<div class="body-empty">No description provided</div>'}
                    </div>
                </div>

                <div class="actions">
                    <button class="btn" id="openInBrowser">Open in Browser</button>
                    <button class="btn" id="addComment">Add Comment</button>
                    <button class="btn" id="editIssue">Edit Issue</button>
                    ${issue.state === 'open'
                        ? '<button class="btn" id="closeIssue">Close Issue</button>'
                        : '<button class="btn" id="reopenIssue">Reopen Issue</button>'}
                    <button class="btn" id="refresh">Refresh</button>
                </div>
            </div>

            <script id="issue-data" type="application/json">${this._escapeHtml(JSON.stringify(issueData))}</script>
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    const issue = JSON.parse(document.getElementById('issue-data').textContent || '{}');

                    const onClick = (id, handler) => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.addEventListener('click', handler);
                        }
                    };

                    onClick('openInBrowser', () => {
                        vscode.postMessage({
                            command: 'openInBrowser',
                            url: issue.html_url
                        });
                    });

                    onClick('addComment', () => {
                        vscode.postMessage({
                            command: 'addComment',
                            issueNumber: issue.number,
                            issueTitle: issue.title
                        });
                    });

                    onClick('editIssue', () => {
                        vscode.postMessage({
                            command: 'editIssue',
                            issueNumber: issue.number,
                            issueTitle: issue.title,
                            issueState: issue.state
                        });
                    });

                    onClick('closeIssue', () => {
                        vscode.postMessage({
                            command: 'closeIssue',
                            issueNumber: issue.number,
                            issueTitle: issue.title
                        });
                    });

                    onClick('reopenIssue', () => {
                        vscode.postMessage({
                            command: 'reopenIssue',
                            issueNumber: issue.number,
                            issueTitle: issue.title
                        });
                    });

                    onClick('refresh', () => {
                        vscode.postMessage({
                            command: 'refresh',
                            issueNumber: issue.number
                        });
                    });
                }())
            </script>
        </body>
        </html>`;
    }

    private _renderStatusPage(message: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tech Debt Issue Details</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 24px;
                }
                .status-page {
                    display: grid;
                    place-items: center;
                    min-height: 40vh;
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="status-page">${this._escapeHtml(message)}</div>
        </body>
        </html>`;
    }

    private _renderLoadingState(message: string): string {
        return this._renderStatusPage(message);
    }

    private _renderErrorState(message: string): string {
        return this._renderStatusPage(message);
    }

    private _formatDate(value?: string): string {
        if (!value) {
            return 'Unknown';
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
    }

    private _serializeIssue(issue: IssueDetails): IssueDetails {
        return {
            number: issue.number,
            title: issue.title,
            body: issue.body ?? '',
            html_url: issue.html_url,
            state: issue.state,
            user: issue.user ? { login: issue.user.login ?? null } : null,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            labels: (issue.labels ?? []).map(label => ({ name: label.name, color: label.color })),
            assignees: (issue.assignees ?? []).map(assignee => ({ login: assignee.login })),
            milestone: issue.milestone ? { title: issue.milestone.title } : null,
            comments: issue.comments ?? 0
        };
    }

    private _escapeLabelColor(color?: string): string {
        const safe = (color || '6a737d').replace(/[^0-9a-f]/gi, '').slice(0, 6);
        return safe.padEnd(6, '0');
    }

    private _escapeHtml(text: string): string {
        return StringUtils.escapeHtml(text);
    }
}
