import * as assert from 'assert';
import * as sinon from 'sinon';
import { TechDebtIssuesProvider } from '../tech-debt-issues-view';
import { GitHubAPI } from '../github-api';

suite('TechDebtIssuesProvider Tests', () => {
	let sandbox: sinon.SinonSandbox;
	let mockGithubApi: any;
	let techDebtIssuesProvider: TechDebtIssuesProvider;

	setup(() => {
		sandbox = sinon.createSandbox();
		
		// Create a mock GitHubAPI
		mockGithubApi = {
			initialize: sandbox.stub().resolves(),
			getTechDebtIssuesWithFilter: sandbox.stub().resolves([])
		};
		
		// Create the provider with the mock API
		techDebtIssuesProvider = new TechDebtIssuesProvider(mockGithubApi);
	});

	teardown(() => {
		sandbox.restore();
	});

	test('setFilter should update the filter and refresh the view', async () => {
		// Spy on the refresh method
		const refreshSpy = sandbox.spy(techDebtIssuesProvider, 'refresh');
		
		// Call setFilter with a state filter
		techDebtIssuesProvider.setFilter({ state: 'closed' });
		
		// Verify refresh was called
		assert.strictEqual(refreshSpy.callCount, 1);
		
		// Now trigger getChildren to verify the filter is applied
		await techDebtIssuesProvider.getChildren();
		
		// Verify the API was called with the correct filter
		sinon.assert.calledWith(mockGithubApi.getTechDebtIssuesWithFilter, { state: 'closed' });
	});

	test('clearFilter should reset filter to default and refresh the view', async () => {
		// First set some filters
		techDebtIssuesProvider.setFilter({ state: 'closed', assignee: 'testUser', creator: 'testCreator' });
		
		// Spy on the refresh method
		const refreshSpy = sandbox.spy(techDebtIssuesProvider, 'refresh');
		
		// Call clearFilter
		techDebtIssuesProvider.clearFilter();
		
		// Verify refresh was called
		assert.strictEqual(refreshSpy.callCount, 1);
		
		// Now trigger getChildren to verify the filter has been reset
		await techDebtIssuesProvider.getChildren();
		
		// Verify the API was called with only the default filter (state: 'open')
		sinon.assert.calledWith(mockGithubApi.getTechDebtIssuesWithFilter, { state: 'open' });
	});

	test('setFilter should handle partial filter updates', async () => {
		// First set the state
		techDebtIssuesProvider.setFilter({ state: 'closed' });
		
		// Then set just the assignee
		techDebtIssuesProvider.setFilter({ assignee: 'testUser' });
		
		// Now trigger getChildren
		await techDebtIssuesProvider.getChildren();
		
		// Verify the API was called with both filters combined
		sinon.assert.calledWith(mockGithubApi.getTechDebtIssuesWithFilter, 
			{ state: 'closed', assignee: 'testUser' });
		
		// Now set just the creator
		techDebtIssuesProvider.setFilter({ creator: 'testCreator' });
		
		// Verify getChildren again
		await techDebtIssuesProvider.getChildren();
		
		// Verify all three filters were applied
		sinon.assert.calledWith(mockGithubApi.getTechDebtIssuesWithFilter, 
			{ state: 'closed', assignee: 'testUser', creator: 'testCreator' });
	});
});
