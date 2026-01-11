import { createGithubClient } from '../src/platforms/github';
import { createHttpClient } from '../src/http/client';
import { Logger } from '../src/logger';

const token = process.env.TEST_GITHUB_TOKEN;
const repo = process.env.TEST_GITHUB_REPO; // owner/repo
const serverUrl = process.env.TEST_GITHUB_SERVER_URL || 'https://github.com';
const apiUrl = process.env.TEST_GITHUB_API_URL || 'https://api.github.com';
const workflowName = process.env.TEST_GITHUB_WORKFLOW;
const ref = process.env.TEST_GITHUB_REF || 'main';

const logger = new Logger(false);

const shouldRun = !!token && !!repo;

const describeFn = shouldRun ? describe : describe.skip;

describeFn('github e2e', () => {
  if (!shouldRun) {
    test.skip('skipped - missing TEST_GITHUB_TOKEN/TEST_GITHUB_REPO', () => undefined);
    return;
  }

  const [owner, repoName] = (repo || '').split('/');
  if (!owner || !repoName) {
    test.skip('skipped - TEST_GITHUB_REPO must be owner/repo', () => undefined);
    return;
  }

  const http = createHttpClient({
    baseUrl: apiUrl,
    token: token!,
    logger,
    verbose: false,
    userAgent: 'git-action-trigger-workflow-e2e',
  });

  const client = createGithubClient({
    baseUrl: serverUrl,
    apiBaseUrl: apiUrl,
    http,
    logger,
    owner,
    repo: repoName,
    token: token!,
    verbose: false,
  });

  test('lists workflows', async () => {
    const { workflows } = await client.listWorkflows();
    expect(Array.isArray(workflows)).toBe(true);
  });

  test('dispatches workflow when name provided', async () => {
    if (!workflowName) {
      return;
    }
    const { workflows } = await client.listWorkflows();
    const wf = workflows.find((w) => w.name === workflowName || w.path?.includes(workflowName));
    if (!wf) {
      throw new Error(`Workflow '${workflowName}' not found in repository ${repo}`);
    }
    const res = await client.dispatchWorkflow(wf, ref, {});
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});

