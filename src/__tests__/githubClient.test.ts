import { createGithubClient } from '../platforms/github';
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

describe('github platform client', () => {
  test('lists workflows via API', async () => {
    const http = fakeHttp({
      'GET /repos/o/r/actions/workflows?per_page=100': {
        status: 200,
        data: { workflows: [{ id: 10, name: 'CI', path: '.github/workflows/ci.yml' }] },
      },
    });

    const client = createGithubClient({
      baseUrl: 'https://github.com',
      apiBaseUrl: 'https://api.github.com',
      http,
      logger,
      owner: 'o',
      repo: 'r',
      token: 'x',
      verbose: true,
    });

    const { workflows, endpoint } = await client.listWorkflows();
    expect(endpoint).toContain('/actions/workflows');
    expect(workflows).toHaveLength(1);
    expect(workflows[0]?.id).toBe(10);
  });

  test('dispatches workflow by id', async () => {
    const http = fakeHttp({
      'POST /repos/o/r/actions/workflows/10/dispatches': { status: 204 },
    });

    const client = createGithubClient({
      baseUrl: 'https://github.com',
      apiBaseUrl: 'https://api.github.com',
      http,
      logger,
      owner: 'o',
      repo: 'r',
      token: 'x',
      verbose: true,
    });

    const res = await client.dispatchWorkflow({ id: 10, name: 'CI' }, 'main', { ok: true });
    expect(res.status).toBe(204);
    expect(res.endpoint).toContain('/workflows/10/dispatches');
  });
});

