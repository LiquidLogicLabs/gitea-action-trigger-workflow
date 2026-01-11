import { HttpClient } from '../http/client';
import { Logger } from '../logger';
import { extractWorkflows, findWorkflowByName } from '../utils/workflows';
import { DispatchResult, PlatformClient, PlatformContext, WorkflowListResult, WorkflowSummary } from './types';

function buildCandidates(owner: string, repo: string) {
  return [
    `/api/v1/repos/${owner}/${repo}/actions/workflows`,
    `/api/v1/repos/${owner}/${repo}/actions/workflows?per_page=100`,
    `/api/v1/repos/${owner}/${repo}/actions/workflows?limit=100`,
  ];
}

async function listWorkflowsInternal(opts: {
  http: HttpClient;
  logger: Logger;
  owner: string;
  repo: string;
  verbose: boolean;
}): Promise<WorkflowListResult> {
  const { http, logger, owner, repo, verbose } = opts;
  const candidates = buildCandidates(owner, repo);
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

function buildDispatchCandidates(owner: string, repo: string, workflow: WorkflowSummary) {
  const dispatchCandidates: string[] = [];
  if (workflow.id != null) {
    dispatchCandidates.push(
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatches`,
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatch`,
    );
  }

  const file = workflow.path || workflow.file;
  if (file) {
    const enc = encodeURIComponent(file);
    dispatchCandidates.push(
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatches`,
      `/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatch`,
    );
  }

  const nameEnc = encodeURIComponent(workflow.name);
  dispatchCandidates.push(
    `/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatches`,
    `/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatch`,
  );

  return dispatchCandidates;
}

async function dispatchWorkflowInternal(opts: {
  http: HttpClient;
  logger: Logger;
  owner: string;
  repo: string;
  workflow: WorkflowSummary;
  ref: string;
  inputs: Record<string, unknown>;
  verbose: boolean;
}): Promise<DispatchResult> {
  const { http, logger, owner, repo, workflow, ref, inputs, verbose } = opts;
  const body = { ref, inputs };
  const dispatchCandidates = buildDispatchCandidates(owner, repo, workflow);
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

export function createGiteaClient(ctx: PlatformContext): PlatformClient {
  const { http, logger, owner, repo, verbose } = ctx;

  return {
    listWorkflows: () =>
      listWorkflowsInternal({
        http,
        logger,
        owner,
        repo,
        verbose,
      }),
    dispatchWorkflow: (workflow, ref, inputs) =>
      dispatchWorkflowInternal({
        http,
        logger,
        owner,
        repo,
        workflow,
        ref,
        inputs,
        verbose,
      }),
  };
}

export function findWorkflowForGitea(workflows: WorkflowSummary[], workflowName: string): WorkflowSummary {
  return findWorkflowByName(workflows, workflowName);
}

