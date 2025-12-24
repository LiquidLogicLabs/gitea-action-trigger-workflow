export type RepoTarget = {
    owner: string;
    repo: string;
    baseUrl?: string;
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
export declare function parseRepoTarget(repoInput: string): RepoTarget;
export declare function readConfig(): ActionConfig;
