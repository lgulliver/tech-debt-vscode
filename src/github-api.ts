import * as vscode from 'vscode';
// Import Octokit dynamically to avoid CommonJS/ESM module issues
type OctokitType = any; // We'll assign this with the dynamic import

export class GitHubAPI {
    private octokit: OctokitType | undefined;
    private static instance: GitHubAPI;

    private constructor() {}

    public static getInstance(): GitHubAPI {
        if (!GitHubAPI.instance) {
            GitHubAPI.instance = new GitHubAPI();
        }
        return GitHubAPI.instance;
    }

    /**
     * Initialize the GitHub API client with an access token
     */
    public async initialize(): Promise<boolean> {
        try {
            // Use VS Code's built-in GitHub authentication provider
            const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
            
            if (session) {
                // Dynamically import Octokit
                const { Octokit } = await import('@octokit/rest');
                this.octokit = new Octokit({ 
                    auth: session.accessToken 
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to initialize GitHub API:', error);
            throw error;
        }
    }

    /**
     * Check if the API client is initialized
     */
    private checkInitialized(): void {
        if (!this.octokit) {
            throw new Error('GitHub API not initialized. Call initialize() first.');
        }
    }

    /**
     * Parse GitHub remote URL to extract owner and repo
     * Handles various GitHub URL formats:
     * - HTTPS: https://github.com/owner/repo.git
     * - SSH: git@github.com:owner/repo.git
     * - Custom SSH config: git@github.com-customconfig:owner/repo.git
     * - Enterprise GitHub: https://github.enterprise.com/owner/repo.git
     */
    private parseGitHubUrl(remoteUrl: string): { owner: string; repo: string } {
        console.log(`Parsing GitHub URL: ${remoteUrl}`);
        
        // Extract owner and repo from different URL formats
        let match;
        
        // Handle HTTPS format: https://github.com/owner/repo.git
        if (remoteUrl.includes('github') && remoteUrl.includes('http')) {
            const httpsRegex = /(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)\/([^\/\n]+)\/([^\/\n]+)(?:\.git)?/i;
            match = remoteUrl.match(httpsRegex);
            
            if (match) {
                return {
                    owner: match[2],
                    repo: match[3]
                };
            }
        }
        
        // Handle standard SSH format: git@github.com:owner/repo.git
        const sshRegex = /git@([^:]+):([^\/]+)\/([^\/\.]+)(?:\.git)?$/;
        match = remoteUrl.match(sshRegex);
        
        if (match) {
            return {
                owner: match[2],
                repo: match[3]
            };
        }
        
        // Handle custom SSH config: git@github.com-customconfig:owner/repo.git
        const customSshRegex = /git@[^-]+-[^:]+:([^\/]+)\/([^\/\.]+)(?:\.git)?$/;
        match = remoteUrl.match(customSshRegex);
        
        if (match) {
            return {
                owner: match[1],
                repo: match[2]
            };
        }
        
        throw new Error(`Cannot parse GitHub owner and repo from URL: ${remoteUrl}`);
    }

    /**
     * Get repository details from the current workspace
     */
    public async getRepoDetails(): Promise<{ owner: string; repo: string }> {
        try {
            // Get the workspace folder (assume the first one is the git repo)
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder open.');
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            
            // Try to activate Git extension first
            try {
                await vscode.commands.executeCommand('git.refresh');
            } catch (e) {
                // Ignore activation errors
                console.log('Git extension activation error, continuing with fallback approach', e);
            }

            // Use git extension API to get repo info
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (!gitExtension) {
                // Fallback to manual input if Git extension is not available
                return await this.getRepoDetailsManually();
            }

            try {
                const api = gitExtension.getAPI(1);
                const repositories = api.repositories;
                
                if (!repositories || repositories.length === 0) {
                    return await this.getRepoDetailsManually('No Git repository found in the workspace');
                }

                // Find the repository matching our workspace
                const repository = repositories.find((repo: any) => repo.rootUri.fsPath === workspaceRoot);
                if (!repository) {
                    return await this.getRepoDetailsManually('No Git repository found for the current workspace');
                }

                const remoteUrl = await repository.getConfig('remote.origin.url');
                if (!remoteUrl) {
                    return await this.getRepoDetailsManually('No remote URL found for this repository');
                }

                console.log(`Detected Git remote URL: ${remoteUrl}`);
                
                // Parse the GitHub URL to get owner and repo
                const repoDetails = this.parseGitHubUrl(remoteUrl);
                console.log(`Parsed repository details - Owner: ${repoDetails.owner}, Repo: ${repoDetails.repo}`);
                
                return repoDetails;
            } catch (error: any) {
                console.error('Error accessing Git repository:', error);
                return await this.getRepoDetailsManually(error.message || 'Unknown Git error');
            }
        } catch (error) {
            console.error('Error getting repository details:', error);
            throw error;
        }
    }

    /**
     * Fallback method to get repository details by asking the user
     */
    private async getRepoDetailsManually(errorContext?: string): Promise<{ owner: string; repo: string }> {
        const message = errorContext 
            ? `GitHub repository detection failed: ${errorContext}. Please enter the details manually.` 
            : 'Please enter GitHub repository details manually:';
        
        vscode.window.showInformationMessage(message);
        
        const ownerInput = await vscode.window.showInputBox({
            title: 'GitHub Repository Owner',
            prompt: 'Enter the GitHub username or organization name',
            placeHolder: 'e.g., microsoft'
        });
        
        if (!ownerInput) {
            throw new Error('Repository owner is required');
        }
        
        const repoInput = await vscode.window.showInputBox({
            title: 'GitHub Repository Name',
            prompt: 'Enter the GitHub repository name',
            placeHolder: 'e.g., vscode'
        });
        
        if (!repoInput) {
            throw new Error('Repository name is required');
        }
        
        return {
            owner: ownerInput.trim(),
            repo: repoInput.trim()
        };
    }

    /**
     * Create a new issue in the GitHub repository
     */
    public async createIssue(title: string, description: string): Promise<{ url: string; number: number }> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.create({
                owner,
                repo,
                title,
                body: description,
                labels: ['tech-debt']
            });

            return {
                url: response.data.html_url,
                number: response.data.number
            };
        } catch (error) {
            console.error('Error creating GitHub issue:', error);
            throw error;
        }
    }

    /**
     * Get all tech debt issues from the GitHub repository
     */
    public async getTechDebtIssues(): Promise<any[]> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.listForRepo({
                owner,
                repo,
                labels: 'tech-debt',
                state: 'open'
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching tech debt issues:', error);
            throw error;
        }
    }

    /**
     * Add a comment to an existing issue
     */
    public async addCommentToIssue(issueNumber: number, comment: string): Promise<{ url: string }> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.createComment({
                owner,
                repo,
                issue_number: issueNumber,
                body: comment
            });

            return {
                url: response.data.html_url
            };
        } catch (error) {
            console.error('Error adding comment to GitHub issue:', error);
            throw error;
        }
    }

    /**
     * Search for tech debt issues with a similar title
     */
    public async searchSimilarIssues(title: string): Promise<any[]> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const searchQuery = `repo:${owner}/${repo} is:issue label:tech-debt in:title ${title}`;
            
            const response = await this.octokit!.search.issuesAndPullRequests({
                q: searchQuery,
                per_page: 5
            });

            return response.data.items;
        } catch (error) {
            console.error('Error searching similar GitHub issues:', error);
            throw error;
        }
    }

    /**
     * Get detailed information about a specific tech debt issue
     */
    public async getIssueDetails(issueNumber: number): Promise<any> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.get({
                owner,
                repo,
                issue_number: issueNumber
            });

            return response.data;
        } catch (error) {
            console.error('Error getting GitHub issue details:', error);
            throw error;
        }
    }

    /**
     * Get all tech debt issues from the GitHub repository with filter options
     */
    public async getTechDebtIssuesWithFilter(filter: { state?: string; assignee?: string; creator?: string }): Promise<any[]> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            // Build query parameters
            const params: any = {
                owner,
                repo,
                labels: 'tech-debt',
                state: filter.state || 'open',
                per_page: 100
            };
            
            // Add optional filters
            if (filter.assignee) {
                params.assignee = filter.assignee;
            }
            
            if (filter.creator) {
                params.creator = filter.creator;
            }
            
            const response = await this.octokit!.issues.listForRepo(params);

            return response.data;
        } catch (error) {
            console.error('Error fetching tech debt issues with filter:', error);
            throw error;
        }
    }

    /**
     * Edit an existing issue
     */
    public async editIssue(issueNumber: number, title: string, body: string): Promise<any> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.update({
                owner,
                repo,
                issue_number: issueNumber,
                title,
                body
            });

            return response.data;
        } catch (error) {
            console.error('Error editing GitHub issue:', error);
            throw error;
        }
    }

    /**
     * Close an issue
     */
    public async closeIssue(issueNumber: number): Promise<any> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.update({
                owner,
                repo,
                issue_number: issueNumber,
                state: 'closed'
            });

            return response.data;
        } catch (error) {
            console.error('Error closing GitHub issue:', error);
            throw error;
        }
    }

    /**
     * Reopen an issue
     */
    public async reopenIssue(issueNumber: number): Promise<any> {
        this.checkInitialized();
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.update({
                owner,
                repo,
                issue_number: issueNumber,
                state: 'open'
            });

            return response.data;
        } catch (error) {
            console.error('Error reopening GitHub issue:', error);
            throw error;
        }
    }
}
