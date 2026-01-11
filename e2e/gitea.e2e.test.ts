import { createGiteaClient } from '../src/platforms/gitea';
import { createHttpClient } from '../src/http/client';
import { Logger } from '../src/logger';

const token = process.env.TEST_GITEA_TOKEN;
const repo = process.env.TEST_GITEA_REPO; // owner/repo
const serverUrl = process.env.TEST_GITEA_URL;
const workflowName = process.env.TEST_GITEA_WORKFLOW;
const ref = process.env.TEST_GITEA_REF || 'main';

const logger = new Logger(false);
const shouldRun = !!token && !!repo && !!serverUrl;
const describeFn = shouldRun ? describe : describe.skip;

describeFn('gitea e2e', () => {
  if (!shouldRun) {
    test.skip('skipped - missing TEST_GITEA_TOKEN/TEST_GITEA_REPO/TEST_GITEA_URL', () => undefined);
    return;
  }

  const [owner, repoName] = (repo || '').split('/');
  if (!owner || !repoName) {
    test.skip('skipped - TEST_GITEA_REPO must be owner/repo', () => undefined);
    return;
  }

  const http = createHttpClient({
    baseUrl: serverUrl!,
    token: token!,
    logger,
    verbose: false,
    userAgent: 'git-action-trigger-workflow-e2e',
  });

  const client = createGiteaClient({
    baseUrl: serverUrl!,
    apiBaseUrl: serverUrl!,
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

