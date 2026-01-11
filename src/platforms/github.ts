import { HttpClient } from '../http/client';
import { Logger } from '../logger';
import { extractWorkflows, findWorkflowByName } from '../utils/workflows';
import { DispatchResult, PlatformClient, PlatformContext, WorkflowListResult, WorkflowSummary } from './types';

function buildListCandidates(owner: string, repo: string) {
  return [
    `/repos/${owner}/${repo}/actions/workflows?per_page=100`,
    `/repos/${owner}/${repo}/actions/workflows`,
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
  const candidates = buildListCandidates(owner, repo);
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
    `Unable to list workflows via GitHub API. Verify token permissions and repository access.\nTried:\n${summary}`,
  );
}

function buildDispatchEndpoints(owner: string, repo: string, workflow: WorkflowSummary) {
  const endpoints: string[] = [];
  const pathOrName = workflow.path || workflow.file || workflow.name;

  if (workflow.id != null) {
    endpoints.push(`/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatches`);
  }

  if (pathOrName) {
    const enc = encodeURIComponent(pathOrName);
    endpoints.push(`/repos/${owner}/${repo}/actions/workflows/${enc}/dispatches`);
  }

  return endpoints;
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
  const endpoints = buildDispatchEndpoints(owner, repo, workflow);
  const attempts: { endpoint: string; status: number }[] = [];

  for (const endpoint of endpoints) {
    const res = await http.postJson<unknown>(endpoint, body);
    attempts.push({ endpoint, status: res.status });
    if (res.status >= 200 && res.status < 300) {
      if (verbose) logger.debug(`Dispatched via: ${endpoint} (${res.status})`);
      return { endpoint, status: res.status };
    }
  }

  const summary = attempts.map((a) => `- ${a.status} ${a.endpoint}`).join('\n');
  throw new Error(
    `Unable to dispatch workflow '${workflow.name}' via GitHub API.\nTried:\n${summary}\n` +
      `Ensure the workflow has a workflow_dispatch trigger and the token has repo/workflow scope.`,
  );
}

export function createGithubClient(ctx: PlatformContext): PlatformClient {
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

export function findWorkflowForGithub(workflows: WorkflowSummary[], workflowName: string): WorkflowSummary {
  return findWorkflowByName(workflows, workflowName);
}

