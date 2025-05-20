import * as vscode from 'vscode';
import { GitHubAPI } from './github-api';

// Define item interface for tech debt issues
export class TechDebtIssueItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly issue: any
    ) {
        super(label, collapsibleState);
        
        this.tooltip = issue.title;
        this.description = `#${issue.number}`;
        
        // Set contextValue to allow context menu items 
        // Include the issue state in the context value for conditional menu items
        this.contextValue = `techDebtIssue${issue.state === 'closed' ? '-closed' : '-open'}`;
        
        // Format the timestamp for when the issue was created
        const createdDate = new Date(issue.created_at);
        const formattedDate = createdDate.toLocaleDateString();
        
        // Add more details as tooltip
        this.tooltip = new vscode.MarkdownString();
        this.tooltip.appendMarkdown(`**${issue.title}** (#${issue.number})\n\n`);
        this.tooltip.appendMarkdown(`State: ${issue.state === 'open' ? '🟢 Open' : '🔴 Closed'}\n`);
        this.tooltip.appendMarkdown(`Created: ${formattedDate}\n\n`);
        if (issue.body) {
            // Truncate the body if it's too long
            const truncatedBody = issue.body.length > 200 
                ? issue.body.substring(0, 200) + '...' 
                : issue.body;
            this.tooltip.appendMarkdown(`${truncatedBody}`);
        }
        
        // Add command to open the issue in browser
        this.command = {
            command: 'vscode.open',
            title: 'Open Issue in Browser',
            arguments: [vscode.Uri.parse(issue.html_url)]
        };
        
        // Add custom icon based on issue state
        this.iconPath = issue.state === 'open' 
            ? new vscode.ThemeIcon('issue-opened') 
            : new vscode.ThemeIcon('issue-closed');
    }
}

export class TechDebtIssuesProvider implements vscode.TreeDataProvider<TechDebtIssueItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TechDebtIssueItem | undefined | null | void> = new vscode.EventEmitter<TechDebtIssueItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TechDebtIssueItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private _filter: { state: string; assignee?: string; creator?: string } = { state: 'open' };

    constructor(private githubApi: GitHubAPI) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setFilter(filter: { state?: string; assignee?: string; creator?: string }): void {
        if (filter.state) {
            this._filter.state = filter.state;
        }
        
        if (filter.assignee !== undefined) {
            this._filter.assignee = filter.assignee;
        }
        
        if (filter.creator !== undefined) {
            this._filter.creator = filter.creator;
        }
        
        this.refresh();
    }

    getTreeItem(element: TechDebtIssueItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TechDebtIssueItem): Promise<TechDebtIssueItem[]> {
        // If element is provided, it's a request for children of a specific node
        // In our case, issues don't have children, so just return an empty array
        if (element) {
            return [];
        }

        try {
            await this.githubApi.initialize();
            const issues = await this.githubApi.getTechDebtIssuesWithFilter(this._filter);
            
            if (issues.length === 0) {
                vscode.window.showInformationMessage(`No tech debt issues found with the current filter.`);
                return [];
            }
            
            return issues.map(issue => new TechDebtIssueItem(
                issue.title,
                vscode.TreeItemCollapsibleState.None,
                issue
            ));
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading tech debt issues: ${error}`);
            return [];
        }
    }
}
