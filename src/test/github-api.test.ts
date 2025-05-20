import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { GitHubAPI } from '../github-api';

suite('GitHub API Tests', () => {
	let sandbox: sinon.SinonSandbox;
	let gitHubAPI: GitHubAPI;
	let mockOctokit: any;

	setup(() => {
		sandbox = sinon.createSandbox();
		
		// Get the singleton instance
		gitHubAPI = GitHubAPI.getInstance();
		
		// Create a mock Octokit instance
		mockOctokit = {
			issues: {
				create: sandbox.stub(),
				listForRepo: sandbox.stub(),
				createComment: sandbox.stub(),
				get: sandbox.stub(),
				update: sandbox.stub()
			},
			search: {
				issuesAndPullRequests: sandbox.stub()
			}
		};
		
		// Stub the private octokit property (using any to bypass TypeScript protection)
		(gitHubAPI as any).octokit = mockOctokit;
	});

	teardown(() => {
		sandbox.restore();
	});

	test('createIssue should call Octokit issues.create with correct parameters', async () => {
		// Stub getRepoDetails to return a fixed value
		sandbox.stub(gitHubAPI, 'getRepoDetails').resolves({ owner: 'testOwner', repo: 'testRepo' });
		
		// Setup mock response
		mockOctokit.issues.create.resolves({
			data: {
				html_url: 'https://github.com/testOwner/testRepo/issues/1',
				number: 1
			}
		});
		
		// Call the method under test
		const result = await gitHubAPI.createIssue('Test Issue', 'Test Description');
		
		// Verify the results
		assert.strictEqual(result.url, 'https://github.com/testOwner/testRepo/issues/1');
		assert.strictEqual(result.number, 1);
		
		// Verify Octokit was called with correct parameters
		sinon.assert.calledOnceWithExactly(mockOctokit.issues.create, {
			owner: 'testOwner',
			repo: 'testRepo',
			title: 'Test Issue',
			body: 'Test Description',
			labels: ['tech-debt']
		});
	});

	test('getTechDebtIssuesWithFilter should filter by state', async () => {
		// Stub getRepoDetails to return a fixed value
		sandbox.stub(gitHubAPI, 'getRepoDetails').resolves({ owner: 'testOwner', repo: 'testRepo' });
		
		// Setup mock response
		mockOctokit.issues.listForRepo.resolves({
			data: [
				{ id: 1, title: 'Test Issue 1', state: 'open' },
				{ id: 2, title: 'Test Issue 2', state: 'closed' }
			]
		});
		
		// Call the method under test with open state filter
		await gitHubAPI.getTechDebtIssuesWithFilter({ state: 'open' });
		
		// Verify Octokit was called with correct parameters
		sinon.assert.calledWith(mockOctokit.issues.listForRepo, sinon.match({
			owner: 'testOwner',
			repo: 'testRepo',
			state: 'open',
			labels: 'tech-debt'
		}));
	});

	test('editIssue should call Octokit issues.update with correct parameters', async () => {
		// Stub getRepoDetails to return a fixed value
		sandbox.stub(gitHubAPI, 'getRepoDetails').resolves({ owner: 'testOwner', repo: 'testRepo' });
		
		// Setup mock response
		mockOctokit.issues.update.resolves({
			data: {
				html_url: 'https://github.com/testOwner/testRepo/issues/1',
				number: 1,
				title: 'Updated Title',
				body: 'Updated Body'
			}
		});
		
		// Call the method under test
		const result = await gitHubAPI.editIssue(1, 'Updated Title', 'Updated Body');
		
		// Verify the results match what was returned
		assert.strictEqual(result.title, 'Updated Title');
		assert.strictEqual(result.body, 'Updated Body');
		
		// Verify Octokit was called with correct parameters
		sinon.assert.calledOnceWithExactly(mockOctokit.issues.update, {
			owner: 'testOwner',
			repo: 'testRepo',
			issue_number: 1,
			title: 'Updated Title',
			body: 'Updated Body'
		});
	});

	test('closeIssue should call Octokit issues.update with state closed', async () => {
		// Stub getRepoDetails to return a fixed value
		sandbox.stub(gitHubAPI, 'getRepoDetails').resolves({ owner: 'testOwner', repo: 'testRepo' });
		
		// Setup mock response
		mockOctokit.issues.update.resolves({
			data: {
				state: 'closed'
			}
		});
		
		// Call the method under test
		const result = await gitHubAPI.closeIssue(1);
		
		// Verify the state is closed
		assert.strictEqual(result.state, 'closed');
		
		// Verify Octokit was called with correct parameters
		sinon.assert.calledOnceWithExactly(mockOctokit.issues.update, {
			owner: 'testOwner',
			repo: 'testRepo',
			issue_number: 1,
			state: 'closed'
		});
	});

	test('reopenIssue should call Octokit issues.update with state open', async () => {
		// Stub getRepoDetails to return a fixed value
		sandbox.stub(gitHubAPI, 'getRepoDetails').resolves({ owner: 'testOwner', repo: 'testRepo' });
		
		// Setup mock response
		mockOctokit.issues.update.resolves({
			data: {
				state: 'open'
			}
		});
		
		// Call the method under test
		const result = await gitHubAPI.reopenIssue(1);
		
		// Verify the state is open
		assert.strictEqual(result.state, 'open');
		
		// Verify Octokit was called with correct parameters
		sinon.assert.calledOnceWithExactly(mockOctokit.issues.update, {
			owner: 'testOwner',
			repo: 'testRepo',
			issue_number: 1,
			state: 'open'
		});
	});
});
