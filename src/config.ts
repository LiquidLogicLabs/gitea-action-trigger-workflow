import * as core from '@actions/core';

export type RepoTarget = {
  owner: string;
  repo: string;
  baseUrl?: string; // derived from repo URL when provided
};

export type ActionConfig = {
  baseUrl: string;
  owner: string;
  repo: string;
  workflowName: string;
  ref: string;
  token: string;
  inputs: Record<string, unknown>;
  verbose: boolean;
};

function parseBool(v: string | undefined, defaultValue: boolean): boolean {
  if (v == null || v === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function mustGetEnvAny(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim() !== '') return v;
  }
  return undefined;
}

export function parseRepoTarget(repoInput: string): RepoTarget {
  // Supports:
  // - owner/repo
  // - https://gitea.example.com/owner/repo(.git)
  if (repoInput.includes('://')) {
    const u = new URL(repoInput);
    const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length < 2) {
      throw new Error(`Invalid repo URL path in 'repo': ${repoInput}`);
    }
    return { baseUrl: u.origin, owner: parts[0]!, repo: parts[1]! };
  }

  const m = repoInput.match(/^([^/]+)\/([^/]+)$/);
  if (!m) throw new Error(`Invalid 'repo' format: ${repoInput} (expected owner/repo or URL)`);
  return { owner: m[1]!, repo: m[2]! };
}

function normalizeBaseUrl(baseUrl: string): string {
  const u = new URL(baseUrl);
  return u.origin;
}

export function readConfig(): ActionConfig {
  const repoInput = core.getInput('repo')?.trim();
  const workflowName = core.getInput('workflow_name', { required: true }).trim();
  const ref = (core.getInput('ref') || '').trim() || 'main';

  const baseUrlInput = core.getInput('base_url')?.trim();
  const tokenInput = core.getInput('token')?.trim();
  const inputsRaw = core.getInput('inputs')?.trim();
  const verbose = parseBool(core.getInput('verbose')?.trim(), false);

  // Defaults from environment (Gitea-compatible + GitHub-compatible fallbacks)
  const envRepo = mustGetEnvAny(['GITEA_REPOSITORY', 'GITHUB_REPOSITORY']);
  const envBaseUrl = mustGetEnvAny(['GITEA_SERVER_URL', 'GITHUB_SERVER_URL']);
  const envToken = mustGetEnvAny(['GITEA_TOKEN', 'GITHUB_TOKEN']);
  const envRef = mustGetEnvAny(['GITEA_REF_NAME', 'GITHUB_REF_NAME', 'GITEA_REF']);

  const repoResolvedInput = repoInput || envRepo;
  if (!repoResolvedInput) {
    throw new Error(
      `Missing repo. Provide input 'repo' or ensure env GITEA_REPOSITORY/GITHUB_REPOSITORY is set.`,
    );
  }

  const target = parseRepoTarget(repoResolvedInput);

  // base_url default order:
  // 1) explicit base_url input
  // 2) derived from repo URL (if repo was URL)
  // 3) runner env base URL
  const baseUrl =
    baseUrlInput || target.baseUrl || envBaseUrl || (() => {
      throw new Error(
        `Missing base URL. Provide input 'base_url', use a URL in 'repo', or ensure env GITEA_SERVER_URL/GITHUB_SERVER_URL is set.`,
      );
    })();

  const token =
    tokenInput || envToken || (() => {
      throw new Error(
        `Missing token. Provide input 'token' or ensure env GITEA_TOKEN/GITHUB_TOKEN is set.`,
      );
    })();

  const parsedInputs: Record<string, unknown> = {};
  if (inputsRaw) {
    try {
      const v = JSON.parse(inputsRaw);
      if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(parsedInputs, v as object);
      else throw new Error('inputs must be a JSON object');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Invalid 'inputs' JSON: ${msg}`);
    }
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    owner: target.owner,
    repo: target.repo,
    workflowName,
    ref: ref || envRef || 'main',
    token,
    inputs: parsedInputs,
    verbose,
  };
}


