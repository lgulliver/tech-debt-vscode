import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { IssueDetailsPanel } from '../issue-details-panel';

suite('IssueDetailsPanel Tests', () => {
	let sandbox: sinon.SinonSandbox;
	let mockGithubApi: any;
	let fakePanel: any;
	let messageHandler: ((message: any) => void) | undefined;

	setup(() => {
		sandbox = sinon.createSandbox();

		messageHandler = undefined;
		mockGithubApi = {
			initialize: sandbox.stub().resolves(),
			getIssueDetails: sandbox.stub()
		};

		fakePanel = {
			title: '',
			reveal: sandbox.stub(),
			dispose: sandbox.stub(),
			onDidDispose: sandbox.stub(),
			webview: {
				html: '',
				onDidReceiveMessage: sandbox.stub().callsFake((handler: (message: any) => void) => {
					messageHandler = handler;
					return { dispose: sandbox.stub() };
				})
			}
		};
	});

	teardown(() => {
		sandbox.restore();
		IssueDetailsPanel.currentPanel = undefined;
	});

	test('update should render detailed issue metadata and escape HTML', async () => {
		const issue = {
			number: 42,
			title: 'Improve <script>alert("x")</script>',
			body: 'Line 1\n<b>Line 2</b>',
			html_url: 'https://github.com/test/repo/issues/42',
			state: 'open',
			user: { login: 'octocat' },
			created_at: '2026-05-16T10:00:00.000Z',
			updated_at: '2026-05-16T11:00:00.000Z',
			labels: [{ name: 'bug', color: 'ff0000' }],
			assignees: [{ login: 'alice' }],
			milestone: { title: 'v1.0' },
			comments: 3
		};

		mockGithubApi.getIssueDetails.resolves(issue);

		const panel = new (IssueDetailsPanel as any)(fakePanel, vscode.Uri.file('/tmp'), mockGithubApi);
		await panel.update(42);

		assert.strictEqual(fakePanel.title.startsWith('Issue #42:'), true);
		assert.match(fakePanel.webview.html, /Open in Browser/);
		assert.match(fakePanel.webview.html, /Add Comment/);
		assert.match(fakePanel.webview.html, /Close Issue/);
		assert.match(fakePanel.webview.html, /octocat/);
		assert.match(fakePanel.webview.html, /alice/);
		assert.match(fakePanel.webview.html, /v1\.0/);
		assert.match(fakePanel.webview.html, /Comments/);
		assert.match(fakePanel.webview.html, /Line 1/);
		assert.match(fakePanel.webview.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
		assert.match(fakePanel.webview.html, /&lt;b&gt;Line 2&lt;\/b&gt;/);
		assert.doesNotMatch(fakePanel.webview.html, /<script>alert\("x"\)<\/script>/);
	});

	test('webview actions should trigger the matching commands', async () => {
		const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves(undefined);
		const openExternalStub = sandbox.stub(vscode.env, 'openExternal').resolves(true);

		const panel = new (IssueDetailsPanel as any)(fakePanel, vscode.Uri.file('/tmp'), mockGithubApi);

		assert.ok(messageHandler);
		messageHandler?.({ command: 'openInBrowser', url: 'https://github.com/test/repo/issues/42' });
		assert.strictEqual(openExternalStub.calledOnce, true);
		assert.strictEqual(openExternalStub.firstCall.args[0].toString(), 'https://github.com/test/repo/issues/42');

		messageHandler?.({ command: 'closeIssue', issueNumber: 42, issueTitle: 'Example issue' });
		sinon.assert.calledWithExactly(executeCommandStub, 'tech-debt-extension.closeIssue', {
			issue: { number: 42, title: 'Example issue' }
		});
		assert.strictEqual(fakePanel.dispose.calledOnce, true);

		panel.dispose();
	});
});
