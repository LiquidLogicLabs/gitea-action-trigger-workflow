import { dispatchWorkflow, findWorkflowByName, listWorkflows, WorkflowLike } from '../gitea';
import type { HttpClient } from '../http';

function fakeHttp(responses: Record<string, { status: number; data?: unknown; text?: string }>): HttpClient {
  return {
    getJson: async <T,>(path: string) =>
      (responses[`GET ${path}`] ?? { status: 404, text: 'not found' }) as { status: number; data?: T; text?: string },
    postJson: async <T,>(path: string) =>
      (responses[`POST ${path}`] ?? { status: 404, text: 'not found' }) as { status: number; data?: T; text?: string },
  };
}

const logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

describe('gitea workflow discovery/dispatch', () => {
  test('listWorkflows tries candidates until one works', async () => {
    const http = fakeHttp({
      'GET /api/v1/repos/o/r/actions/workflows': { status: 404 },
      'GET /api/v1/repos/o/r/actions/workflows?per_page=100': {
        status: 200,
        data: { workflows: [{ id: 1, name: 'Build' }] },
      },
    });

    const { workflows } = await listWorkflows({ http, logger, owner: 'o', repo: 'r', verbose: true });
    expect(workflows).toHaveLength(1);
    expect(workflows[0]!.name).toBe('Build');
  });

  test('findWorkflowByName matches exact name', () => {
    const workflows: WorkflowLike[] = [{ id: 1, name: 'Deploy' }, { id: 2, name: 'Build' }];
    expect(findWorkflowByName(workflows, 'Build')).toEqual({ id: 2, name: 'Build' });
  });

  test('dispatchWorkflow prefers id-based dispatch routes', async () => {
    const http = fakeHttp({
      'POST /api/v1/repos/o/r/actions/workflows/2/dispatches': { status: 204 },
    });

    const res = await dispatchWorkflow({
      http,
      logger,
      owner: 'o',
      repo: 'r',
      workflow: { id: 2, name: 'Build' },
      ref: 'main',
      inputs: { env: 'prod' },
      verbose: true,
    });

    expect(res.status).toBe(204);
    expect(res.endpoint).toContain('/workflows/2/dispatches');
  });
});


