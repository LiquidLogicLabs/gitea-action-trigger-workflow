import { Logger } from '../logger';
import { HttpClient } from '../http/client';

export type PlatformId = 'github' | 'gitea';

export type WorkflowSummary = {
  id?: number;
  name: string;
  path?: string;
  file?: string;
};

export type WorkflowListResult = {
  endpoint: string;
  workflows: WorkflowSummary[];
};

export type DispatchResult = {
  endpoint: string;
  status: number;
};

export type PlatformContext = {
  baseUrl: string;
  apiBaseUrl: string;
  owner: string;
  repo: string;
  token: string;
  logger: Logger;
  verbose: boolean;
  http: HttpClient;
};

export type PlatformClient = {
  listWorkflows: () => Promise<WorkflowListResult>;
  dispatchWorkflow: (
    workflow: WorkflowSummary,
    ref: string,
    inputs: Record<string, unknown>,
  ) => Promise<DispatchResult>;
};

