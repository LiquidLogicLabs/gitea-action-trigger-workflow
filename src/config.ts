import * as core from '@actions/core';
import { PlatformId } from './platforms/types';

export type RepoTarget = {
  owner: string;
  repo: string;
  baseUrl?: string; // derived from repo URL when provided
};

export type ActionConfig = {
  platform: PlatformId;
  baseUrl: string; // server URL (origin)
  apiBaseUrl: string; // API base for the chosen platform
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

function getEnvAny(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim() !== '') return v;
  }
  return undefined;
}

export function parseRepoTarget(repoInput: string): RepoTarget {
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

function normalizeOrigin(baseUrl: string): string {
  const u = new URL(baseUrl);
  return u.origin;
}

function detectPlatform(baseUrl: string | undefined, repoUrlHost: string | undefined): PlatformId {
  const host = (baseUrl && new URL(baseUrl).host) || repoUrlHost || '';
  const hasGithubEnv = !!getEnvAny(['GITHUB_SERVER_URL', 'GITHUB_REPOSITORY', 'GITHUB_API_URL', 'GITHUB_ACTIONS']);
  if (host.includes('github.') || host === 'github.com' || hasGithubEnv) {
    return 'github';
  }
  return 'gitea';
}

function computeApiBase(platform: PlatformId, baseUrl: string): string {
  if (platform === 'github') {
    const host = new URL(baseUrl).host;
    if (host === 'github.com') {
      return 'https://api.github.com';
    }
    // GHES: server URL -> append /api/v3
    return `${normalizeOrigin(baseUrl)}/api/v3`;
  }
  // Gitea: API rooted at server origin
  return normalizeOrigin(baseUrl);
}

function parseInputs(inputsRaw?: string): Record<string, unknown> {
  if (!inputsRaw) return {};
  try {
    const v = JSON.parse(inputsRaw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return { ...(v as object) };
    throw new Error('inputs must be a JSON object');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid 'inputs' JSON: ${msg}`);
  }
}

export function readConfig(): ActionConfig {
  const repoInput = core.getInput('repo')?.trim();
  const workflowName = core.getInput('workflow_name', { required: true }).trim();
  const refInput = (core.getInput('ref') || '').trim();

  const baseUrlInput = core.getInput('base_url')?.trim();
  const tokenInput = core.getInput('token')?.trim();
  const inputsRaw = core.getInput('inputs')?.trim();
  const verbose = parseBool(core.getInput('verbose')?.trim(), false);

  const envRepo = getEnvAny(['GITEA_REPOSITORY', 'GITHUB_REPOSITORY']);
  const envBaseUrl = getEnvAny(['GITEA_SERVER_URL', 'GITHUB_SERVER_URL']);
  const envToken = getEnvAny(['GITEA_TOKEN', 'GITHUB_TOKEN']);
  const envRef = getEnvAny(['GITEA_REF_NAME', 'GITHUB_REF_NAME', 'GITEA_REF']);

  const repoResolvedInput = repoInput || envRepo;
  if (!repoResolvedInput) {
    throw new Error(`Missing repo. Provide input 'repo' or ensure env GITEA_REPOSITORY/GITHUB_REPOSITORY is set.`);
  }

  const target = parseRepoTarget(repoResolvedInput);

  const baseUrl =
    baseUrlInput ||
    target.baseUrl ||
    envBaseUrl ||
    (() => {
      throw new Error(
        `Missing base URL. Provide input 'base_url', use a URL in 'repo', or ensure env GITEA_SERVER_URL/GITHUB_SERVER_URL is set.`,
      );
    })();

  const platform = detectPlatform(baseUrl, target.baseUrl ? new URL(baseUrl).host : undefined);

  const apiBaseUrl = computeApiBase(platform, baseUrl);

  const token =
    tokenInput ||
    envToken ||
    (() => {
      throw new Error(`Missing token. Provide input 'token' or ensure env GITEA_TOKEN/GITHUB_TOKEN is set.`);
    })();

  const parsedInputs = parseInputs(inputsRaw);

  return {
    platform,
    baseUrl: normalizeOrigin(baseUrl),
    apiBaseUrl,
    owner: target.owner,
    repo: target.repo,
    workflowName,
    ref: refInput || envRef || 'main',
    token,
    inputs: parsedInputs,
    verbose,
  };
}

export const __internal = {
  detectPlatform,
  computeApiBase,
  normalizeOrigin,
};