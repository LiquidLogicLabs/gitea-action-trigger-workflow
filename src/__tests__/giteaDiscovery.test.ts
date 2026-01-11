import { createGiteaClient } from '../platforms/gitea';
import type { HttpClient } from '../http/client';
import { Logger } from '../logger';

function fakeHttp(responses: Record<string, { status: number; data?: unknown; text?: string }>): HttpClient {
  return {
    getJson: async <T,>(path: string) =>
      (responses[`GET ${path}`] ?? { status: 404, text: 'not found' }) as { status: number; data?: T; text?: string },
    postJson: async <T,>(path: string) =>
      (responses[`POST ${path}`] ?? { status: 404, text: 'not found' }) as { status: number; data?: T; text?: string },
  };
}

const logger = new Logger(false);

describe('gitea platform client', () => {
  test('listWorkflows tries candidates until one works', async () => {
    const http = fakeHttp({
      'GET /api/v1/repos/o/r/actions/workflows': { status: 404 },
      'GET /api/v1/repos/o/r/actions/workflows?per_page=100': {
        status: 200,
        data: { workflows: [{ id: 1, name: 'Build' }] },
      },
    });

    const client = createGiteaClient({
      baseUrl: 'https://gitea.example.com',
      apiBaseUrl: 'https://gitea.example.com',
      http,
      logger,
      owner: 'o',
      repo: 'r',
      token: 'x',
      verbose: true,
    });

    const { workflows } = await client.listWorkflows();
    expect(workflows).toHaveLength(1);
    expect(workflows[0]!.name).toBe('Build');
  });

  test('dispatchWorkflow prefers id-based dispatch routes', async () => {
    const http = fakeHttp({
      'POST /api/v1/repos/o/r/actions/workflows/2/dispatches': { status: 204 },
    });

    const client = createGiteaClient({
      baseUrl: 'https://gitea.example.com',
      apiBaseUrl: 'https://gitea.example.com',
      http,
      logger,
      owner: 'o',
      repo: 'r',
      token: 'x',
      verbose: true,
    });

    const res = await client.dispatchWorkflow({ id: 2, name: 'Build' }, 'main', { env: 'prod' });

    expect(res.status).toBe(204);
    expect(res.endpoint).toContain('/workflows/2/dispatches');
  });
});

