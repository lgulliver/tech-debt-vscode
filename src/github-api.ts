import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { StringUtils } from './utils/string-utils';

// Import Octokit dynamically to avoid CommonJS/ESM module issues
type OctokitType = any; // We'll assign this with the dynamic import

export class GitHubAPI {
    private octokit: OctokitType | undefined;
    private static instance: GitHubAPI;
    private _token: string | undefined;
    private _owner: string | undefined;
    private _repo: string | undefined;
    private _cachedRepoDetails: { owner: string; repo: string } | undefined;
    private _initializationStatus: 'not-started' | 'in-progress' | 'initialized' | 'failed' = 'not-started';
    private _initializationError: Error | undefined;
    private _initializationPromise: Promise<boolean> | undefined;

    private constructor() {}

    public static getInstance(): GitHubAPI {
        if (!GitHubAPI.instance) {
            GitHubAPI.instance = new GitHubAPI();
        }
        return GitHubAPI.instance;
    }

    /**
     * Check if the API is configured
     */
    public isConfigured(): boolean {
        return !!this._owner && !!this._repo && !!this.octokit;
    }

    /**
     * Get initialization status
     */
    public getInitializationStatus(): { status: string; error?: string } {
        return {
            status: this._initializationStatus,
            error: this._initializationError ? this._initializationError.message : undefined
        };
    }

    /**
     * Initialize the GitHub API client
     */
    public async initialize(): Promise<boolean> {
        // If initialization is already in progress, return the existing promise
        if (this._initializationPromise) {
            return this._initializationPromise;
        }

        // If already initialized successfully, return true immediately
        if (this._initializationStatus === 'initialized') {
            return true;
        }

        // Mark as in progress and create the promise
        this._initializationStatus = 'in-progress';
        this._initializationPromise = this._initialize();

        try {
            const result = await this._initializationPromise;
            // Clear the promise reference after completion
            this._initializationPromise = undefined;
            return result;
        } catch (error) {
            // Clear the promise reference on error
            this._initializationPromise = undefined;
            throw error;
        }
    }

    /**
     * Internal initialization implementation
     */
    private async _initialize(): Promise<boolean> {
        try {
            // Use VS Code's built-in GitHub authentication provider with a timeout
            let session;
            try {
                session = await Promise.race([
                    vscode.authentication.getSession('github', ['repo'], { createIfNone: true }),
                    new Promise<undefined>((_, reject) => 
                        setTimeout(() => reject(new Error('Authentication timed out')), 30000)
                    )
                ]);
            } catch (authError: any) {
                if (authError.message?.includes('timed out')) {
                    this._initializationStatus = 'failed';
                    this._initializationError = new Error('GitHub authentication timed out. Please try again later.');
                    throw this._initializationError;
                }
                throw authError;
            }
            
            if (!session) {
                this._initializationStatus = 'failed';
                this._initializationError = new Error('GitHub authentication is required');
                throw this._initializationError;
            }

            // Initialize Octokit with the session token and configure request retries
            const { Octokit } = await import('@octokit/rest');
            this.octokit = new Octokit({ 
                auth: session.accessToken,
                request: {
                    timeout: 10000 // 10 seconds timeout
                }
            });
            this._token = session.accessToken;

            // Get repository information
            const repoInfo = await this.detectRepositoryDetails();
            if (!repoInfo) {
                this._initializationStatus = 'failed';
                this._initializationError = new Error('Could not detect GitHub repository. Please open a folder containing a GitHub repository.');
                throw this._initializationError;
            }

            this._owner = repoInfo.owner;
            this._repo = repoInfo.repo;
            this._cachedRepoDetails = repoInfo;

            this._initializationStatus = 'initialized';
            return true;
        } catch (error: any) {
            console.error('Failed to initialize GitHub API:', error);
            this._initializationStatus = 'failed';
            this._initializationError = error;
            throw error;
        }
    }

    /**
     * Get repository details
     */
    private async detectRepositoryDetails(): Promise<{ owner: string; repo: string } | null> {
        try {
            // Try the Git extension first
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (gitExtension) {
                const api = gitExtension.getAPI(1);
                const repositories = api.repositories;

                if (repositories?.[0]) {
                    const remoteUrl = await repositories[0].getConfig('remote.origin.url');
                    if (remoteUrl) {
                        return this.parseGitHubUrl(remoteUrl);
                    }
                }
            }

            // Fall back to workspace detection if Git extension fails
            return await GitHubAPI.detectRepositoryFromWorkspace();
        } catch (error) {
            console.error('Error detecting repository details:', error);
            return null;
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
        // Safety check for null/undefined/empty
        if (!remoteUrl) {
            throw new Error('Repository URL cannot be empty');
        }

        // Trim any whitespace
        remoteUrl = StringUtils.truncate(remoteUrl.trim(), 2000);
        
        console.log(`Parsing GitHub URL: ${remoteUrl}`);
        
        // Extract owner and repo from different URL formats
        let match;
        let owner = '';
        let repo = '';
        
        // Handle HTTPS format: https://github.com/owner/repo.git
        if (remoteUrl.includes('github') && remoteUrl.includes('http')) {
            const httpsRegex = /(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)\/([^\/\n]+)\/([^\/\n]+?)(?:\.git)?$/i;
            match = remoteUrl.match(httpsRegex);
            
            if (match && match.length >= 4) {
                owner = match[2];
                repo = match[3];
            }
        }
        
        // If not matched yet, try standard SSH format: git@github.com:owner/repo.git
        if (!owner && !repo) {
            const sshRegex = /git@([^:]+):([^\/]+)\/([^\/\.]+?)(?:\.git)?$/;
            match = remoteUrl.match(sshRegex);
            
            if (match && match.length >= 4) {
                owner = match[2];
                repo = match[3];
            }
        }
        
        // If still not matched, try custom SSH config: git@github.com-customconfig:owner/repo.git
        if (!owner && !repo) {
            const customSshRegex = /git@[^-]+-[^:]+:([^\/]+)\/([^\/\.]+?)(?:\.git)?$/;
            match = remoteUrl.match(customSshRegex);
            
            if (match && match.length >= 3) {
                owner = match[1];
                repo = match[2];
            }
        }
        
        // Validate the result
        if (!owner || !repo) {
            throw new Error(`Cannot parse GitHub owner and repo from URL: ${StringUtils.escapeHtml(remoteUrl)}`);
        }
        
        // Use our dedicated sanitization method for URL components
        owner = StringUtils.sanitizeUrlComponent(owner);
        repo = StringUtils.sanitizeUrlComponent(repo);
        
        // Additional validation after sanitization
        if (!owner || !repo) {
            throw new Error('Repository owner and name must not be empty after sanitization');
        }
        
        return { owner, repo };
    }

    /**
     * Get repository details
     */
    public async getRepoDetails(): Promise<{ owner: string; repo: string }> {
        if (!this._cachedRepoDetails) {
            throw new Error('Repository details not available. Please open a GitHub repository.');
        }
        return this._cachedRepoDetails;
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
        
        // Sanitize and validate inputs
        const sanitizedOwner = StringUtils.sanitizeUrlComponent(ownerInput);
        const sanitizedRepo = StringUtils.sanitizeUrlComponent(repoInput);
        
        // Additional validation
        if (!sanitizedOwner || sanitizedOwner.length < 1) {
            throw new Error('Repository owner is invalid or contains disallowed characters');
        }
        
        if (!sanitizedRepo || sanitizedRepo.length < 1) {
            throw new Error('Repository name is invalid or contains disallowed characters');
        }
        
        return {
            owner: sanitizedOwner,
            repo: sanitizedRepo
        };
    }

    /**
     * Create a new issue in the GitHub repository
     * 
     * @param title The title of the issue
     * @param description The description/body of the issue
     * @returns Object containing the URL and number of the created issue
     * @throws Error if validation fails or GitHub API errors
     */
    public async createIssue(title: string, description: string): Promise<{ url: string; number: number }> {
        this.checkInitialized();
        
        // Input validation
        if (!title || !title.trim()) {
            throw new Error('Issue title is required');
        }
        
        if (!StringUtils.validateLength(title, 1, 256)) {
            throw new Error('Issue title must be between 1 and 256 characters');
        }
        
        // Use StringUtils for safer input handling
        const safeTitle = StringUtils.truncate(title.trim(), 256);
        const safeDescription = description ? StringUtils.truncate(description, 65536) : '';
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            // Use a retry mechanism for network issues
            const maxRetries = 3;
            let lastError;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const response = await this.octokit!.issues.create({
                        owner,
                        repo,
                        title: safeTitle,
                        body: safeDescription,
                        labels: ['tech-debt']
                    });

                    return {
                        url: response.data.html_url,
                        number: response.data.number
                    };
                } catch (error: any) {
                    lastError = error;
                    
                    // Check for specific network issues that are retryable
                    if (error.message?.includes('other side closed') || 
                        error.message?.includes('ECONNRESET') ||
                        error.message?.includes('ETIMEDOUT') ||
                        error.message?.includes('network timeout')) {
                        
                        console.log(`GitHub API connection issue on attempt ${attempt}, retrying...`);
                        
                        // Wait before retrying (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                        
                        // If this isn't our last attempt, continue to the next retry
                        if (attempt < maxRetries) {
                            continue;
                        }
                    }
                    
                    // Not a retryable error or we've exhausted retries, so break out
                    break;
                }
            }
            
            // If we reached here, all retries failed
            if (lastError?.message?.includes('other side closed')) {
                throw new Error('Connection to GitHub was lost. Please check your internet connection and try again.');
            }
            
            throw lastError;
        } catch (error: any) {
            console.error('Error creating GitHub issue:', error);
            
            // Check if this might be an authentication issue
            if (error.status === 401 || error.message?.includes('Bad credentials')) {
                await vscode.commands.executeCommand('workbench.action.clearEditorHistory');
                throw new Error('GitHub authentication failed. Please sign out and sign in again.');
            }
            
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
        
        // Input validation
        if (!comment || !comment.trim()) {
            throw new Error('Comment text is required');
        }
        
        if (isNaN(issueNumber) || issueNumber <= 0) {
            throw new Error('Valid issue number is required');
        }
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            // Truncate overly long comments
            const safeComment = StringUtils.truncate(comment.trim(), 65536);
            
            const response = await this.octokit!.issues.createComment({
                owner,
                repo,
                issue_number: issueNumber,
                body: safeComment
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
        
        if (!title) {
            return [];
        }
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            // Sanitize the search query to prevent injection attacks
            const sanitizedTitle = StringUtils.sanitizeSearchQuery(title);
            
            const searchQuery = `repo:${owner}/${repo} is:issue label:tech-debt in:title ${sanitizedTitle}`;
            
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
     * 
     * @param issueNumber The number of the issue to get details for
     * @returns The issue data
     * @throws Error if validation fails or GitHub API errors
     */
    public async getIssueDetails(issueNumber: number): Promise<any> {
        this.checkInitialized();
        
        // Input validation
        if (isNaN(issueNumber) || issueNumber <= 0) {
            throw new Error('Valid issue number is required');
        }
        
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
     * 
     * @param filter Object containing filter options for issues (state, assignee, creator)
     * @returns Array of issues matching the filter criteria
     * @throws Error if GitHub API errors occur
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
                state: (filter.state && ['open', 'closed', 'all'].includes(filter.state)) ? filter.state : 'open',
                per_page: 100
            };
            
            // Add optional filters with sanitization
            if (filter.assignee) {
                params.assignee = StringUtils.sanitizeUrlComponent(filter.assignee);
            }
            
            if (filter.creator) {
                params.creator = StringUtils.sanitizeUrlComponent(filter.creator);
            }
            
            const response = await this.octokit!.issues.listForRepo(params);

            return response.data;
        } catch (error) {
            console.error('Error fetching tech debt issues with filter:', error);
            throw error;
        }
    }

    /**
     * Get all comments for a specific issue
     * 
     * @param issueNumber The number of the issue to get comments for
     * @returns Array of comment objects from GitHub API
     * @throws Error if validation fails or GitHub API errors
     */
    public async getIssueComments(issueNumber: number): Promise<any[]> {
        this.checkInitialized();
        
        // Input validation
        if (isNaN(issueNumber) || issueNumber <= 0) {
            throw new Error('Valid issue number is required');
        }
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.listComments({
                owner,
                repo,
                issue_number: issueNumber,
                per_page: 100 // Get up to 100 comments
            });

            return response.data;
        } catch (error) {
            console.error('Error getting GitHub issue comments:', error);
            throw error;
        }
    }

    /**
     * Edit an existing issue
     * 
     * @param issueNumber The number of the issue to edit
     * @param title The new title for the issue
     * @param body The new body/description for the issue
     * @returns The updated issue data
     * @throws Error if validation fails or GitHub API errors
     */
    public async editIssue(issueNumber: number, title: string, body: string): Promise<any> {
        this.checkInitialized();
        
        // Input validation
        if (isNaN(issueNumber) || issueNumber <= 0) {
            throw new Error('Valid issue number is required');
        }
        
        if (!title || !title.trim()) {
            throw new Error('Issue title is required');
        }
        
        if (!StringUtils.validateLength(title, 1, 256)) {
            throw new Error('Issue title must be between 1 and 256 characters');
        }
        
        // Use StringUtils for safer input handling
        const safeTitle = StringUtils.truncate(title.trim(), 256);
        const safeBody = body ? StringUtils.truncate(body, 65536) : '';
        
        try {
            const { owner, repo } = await this.getRepoDetails();
            
            const response = await this.octokit!.issues.update({
                owner,
                repo,
                issue_number: issueNumber,
                title: safeTitle,
                body: safeBody
            });

            return response.data;
        } catch (error) {
            console.error('Error editing GitHub issue:', error);
            throw error;
        }
    }

    /**
     * Close an issue
     * 
     * @param issueNumber The number of the issue to close
     * @returns The updated issue data
     * @throws Error if validation fails or GitHub API errors
     */
    public async closeIssue(issueNumber: number): Promise<any> {
        this.checkInitialized();
        
        // Input validation
        if (isNaN(issueNumber) || issueNumber <= 0) {
            throw new Error('Valid issue number is required');
        }
        
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
     * 
     * @param issueNumber The number of the issue to reopen
     * @returns The updated issue data
     * @throws Error if validation fails or GitHub API errors
     */
    public async reopenIssue(issueNumber: number): Promise<any> {
        this.checkInitialized();
        
        // Input validation
        if (isNaN(issueNumber) || issueNumber <= 0) {
            throw new Error('Valid issue number is required');
        }
        
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

    /**
     * Detects GitHub repository information from the current workspace
     * @returns {Promise<{owner: string, repo: string} | null>} Repository information or null if not detected
     */
    public static async detectRepositoryFromWorkspace(): Promise<{owner: string, repo: string} | null> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }
            
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            
            // Method 1: Try to read .git/config file
            try {
                const gitConfigPath = path.join(workspaceRoot, '.git', 'config');
                if (fs.existsSync(gitConfigPath)) {
                    const configContent = fs.readFileSync(gitConfigPath, 'utf8');
                    const remoteUrlMatch = configContent.match(/\[remote "[^"]+"\][\s\S]*?url = (?:https:\/\/github\.com\/|git@github\.com:)([^\/]+)\/([^\.]+)(?:\.git)?/);
                    
                    if (remoteUrlMatch && remoteUrlMatch.length >= 3) {
                        // Sanitize the owner and repo values
                        const owner = StringUtils.sanitizeUrlComponent(remoteUrlMatch[1]);
                        const repo = StringUtils.sanitizeUrlComponent(remoteUrlMatch[2]);
                        
                        if (owner && repo) {
                            return { owner, repo };
                        }
                    }
                }
            } catch (err) {
                // Silently fail and try next method
            }
            
            // Method 2: Try using git command
            try {
                const gitRemoteOutput = execSync('git remote -v', { cwd: workspaceRoot, encoding: 'utf8' });
                const gitRemoteMatch = gitRemoteOutput.match(/origin\s+(?:https:\/\/github\.com\/|git@github\.com:)([^\/]+)\/([^\.]+)(?:\.git)?/);
                
                if (gitRemoteMatch && gitRemoteMatch.length >= 3) {
                    // Sanitize the owner and repo values
                    const owner = StringUtils.sanitizeUrlComponent(gitRemoteMatch[1]);
                    const repo = StringUtils.sanitizeUrlComponent(gitRemoteMatch[2]);
                    
                    if (owner && repo) {
                        return { owner, repo };
                    }
                }
            } catch (err) {
                // Silently fail and try next method
            }
            
            return null;
        } catch (error) {
            console.error('Error detecting repository:', error);
            return null;
        }
    }
    
    /**
     * Update repository configuration
     */
    public setRepositoryInfo(owner: string, repo: string): void {
        this._owner = owner;
        this._repo = repo;
    }

    /**
     * Get current repository configuration
     */
    public getRepositoryInfo(): { owner: string | undefined; repo: string | undefined } {
        return {
            owner: this._owner,
            repo: this._repo
        };
    }

    /**
     * Update repository configuration in VS Code settings
     */
    private async updateRepositoryConfig(owner: string, repo: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('techDebt');
        await config.update('githubOwner', owner, vscode.ConfigurationTarget.Global);
        await config.update('githubRepo', repo, vscode.ConfigurationTarget.Global);
        this.setRepositoryInfo(owner, repo);
    }
    
    /**
     * Initialize the API with repository information from the workspace
     */
    public async initFromWorkspace(): Promise<boolean> {
        try {
            // Try to detect from workspace
            const repoInfo = await GitHubAPI.detectRepositoryFromWorkspace();
            if (repoInfo) {
                this._owner = repoInfo.owner;
                this._repo = repoInfo.repo;
                return true;
            }
            
            // If detection fails, prompt user
            const manualInfo = await this.getRepoDetailsManually();
            if (manualInfo) {
                this._owner = manualInfo.owner;
                this._repo = manualInfo.repo;
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error initializing from workspace:', error);
            return false;
        }
    }
    
    /**
     * Check if the API has valid repository configuration
     */
    public hasValidRepositoryConfig(): boolean {
        return Boolean(this._token && this._owner && this._repo);
    }

}
