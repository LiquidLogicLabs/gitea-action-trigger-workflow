import { HttpClient } from './http';
import { Logger } from './log';

export type WorkflowLike = {
  id?: number;
  name: string;
  path?: string;
  file?: string;
};

function isWorkflowLike(x: unknown): x is WorkflowLike {
  if (!x || typeof x !== 'object') return false;
  const name = (x as any).name;
  return typeof name === 'string' && name.trim() !== '';
}

function extractWorkflows(payload: unknown): WorkflowLike[] | null {
  if (Array.isArray(payload)) {
    const ws = payload.filter(isWorkflowLike) as WorkflowLike[];
    return ws.length > 0 ? ws : [];
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as any;
    if (Array.isArray(obj.workflows)) {
      const ws = obj.workflows.filter(isWorkflowLike) as WorkflowLike[];
      return ws.length > 0 ? ws : [];
    }
    if (Array.isArray(obj.data)) {
      const ws = obj.data.filter(isWorkflowLike) as WorkflowLike[];
      return ws.length > 0 ? ws : [];
    }
  }
  return null;
}

function normalizeName(s: string): string {
  return s.trim();
}

export async function listWorkflows(opts: {
  http: HttpClient;
  logger: Logger;
  owner: string;
  repo: string;
  verbose: boolean;
}): Promise<{ endpoint: string; workflows: WorkflowLike[] }> {
  const { http, logger, owner, repo, verbose } = opts;

  const candidates = [
    `/api/v1/repos/${owner}/${repo}/actions/workflows`,
    `/api/v1/repos/${owner}/${repo}/actions/workflows?per_page=100`,
    `/api/v1/repos/${owner}/${repo}/actions/workflows?limit=100`,
  ];

  const attempts: { endpoint: string; status: number; hint?: string }[] = [];

  for (const endpoint of candidates) {
    const res = await http.getJson<unknown>(endpoint);
    attempts.push({ endpoint, status: res.status });
    if (res.status >= 200 && res.status < 300 && res.data !== undefined) {
      const ws = extractWorkflows(res.data);
      if (ws !== null) {
        if (verbose) logger.debug(`Using workflows list endpoint: ${endpoint} (count=${ws.length})`);
        return { endpoint, workflows: ws };
      }
      attempts[attempts.length - 1]!.hint = 'Unexpected JSON schema';
    }
  }

  const summary = attempts
    .map((a) => `- ${a.status} ${a.endpoint}${a.hint ? ` (${a.hint})` : ''}`)
    .join('\n');
  throw new Error(
    `Unable to list workflows via API. This Gitea instance may not expose an Actions workflows API.\n` +
      `Tried:\n${summary}\n\n` +
      `If you believe your server supports it, enable verbose logging and verify your base_url/token permissions.`,
  );
}

export function findWorkflowByName(workflows: WorkflowLike[], workflowName: string): WorkflowLike {
  const needle = normalizeName(workflowName);
  const matches = workflows.filter((w) => normalizeName(w.name) === needle);

  if (matches.length === 1) return matches[0]!;

  const available = workflows
    .map((w) => `- ${w.name}${w.id != null ? ` (id=${w.id})` : ''}${w.path ? ` [${w.path}]` : ''}`)
    .slice(0, 50)
    .join('\n');

  if (matches.length === 0) {
    throw new Error(`Workflow '${workflowName}' not found. Available workflows:\n${available || '(none found)'}`);
  }

  throw new Error(
    `Workflow '${workflowName}' is ambiguous (${matches.length} matches). Please disambiguate by renaming workflows.\n` +
      `Matches:\n${matches.map((w) => `- ${w.name}${w.id != null ? ` (id=${w.id})` : ''}${w.path ? ` [${w.path}]` : ''}`).join('\n')}`,
  );
}

export async function dispatchWorkflow(opts: {
  http: HttpClient;
  logger: Logger;
  owner: string;
  repo: string;
  workflow: WorkflowLike;
  ref: string;
  inputs: Record<string, unknown>;
  verbose: boolean;
}): Promise<{ endpoint: string; status: number }> {
  const { http, logger, owner, repo, workflow, ref, inputs, verbose } = opts;

  const body = { ref, inputs };

  const dispatchCandidates: string[] = [];
  if (workflow.id != null) {
    dispatchCandidates.push(
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatches`,
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatch`,
    );
  }

  // If server returns a path/filename, try file-based dispatch routes too.
  const file = workflow.path || workflow.file;
  if (file) {
    const enc = encodeURIComponent(file);
    dispatchCandidates.push(
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatches`,
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatch`,
    );
  }

  // As a last resort, try a name-based route (some servers might support it).
  const nameEnc = encodeURIComponent(workflow.name);
  dispatchCandidates.push(
    `/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatches`,
    `/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatch`,
  );

  const attempts: { endpoint: string; status: number }[] = [];

  for (const endpoint of dispatchCandidates) {
    const res = await http.postJson<unknown>(endpoint, body);
    attempts.push({ endpoint, status: res.status });
    if (res.status >= 200 && res.status < 300) {
      if (verbose) logger.debug(`Dispatched via: ${endpoint} (${res.status})`);
      return { endpoint, status: res.status };
    }
  }

  const summary = attempts.map((a) => `- ${a.status} ${a.endpoint}`).join('\n');
  throw new Error(
    `Unable to dispatch workflow '${workflow.name}'. This server may not support remote dispatch via API.\n` +
      `Tried:\n${summary}\n\n` +
      `If you control the target repo, a reliable fallback is to add a workflow trigger based on a repo event you can create via API (e.g. push tag/commit), or expose a lightweight webhook endpoint that triggers the workflow.`,
  );
}


