import { HttpClient } from './http';
import { Logger } from './log';
export type WorkflowLike = {
    id?: number;
    name: string;
    path?: string;
    file?: string;
};
export declare function listWorkflows(opts: {
    http: HttpClient;
    logger: Logger;
    owner: string;
    repo: string;
    verbose: boolean;
}): Promise<{
    endpoint: string;
    workflows: WorkflowLike[];
}>;
export declare function findWorkflowByName(workflows: WorkflowLike[], workflowName: string): WorkflowLike;
export declare function dispatchWorkflow(opts: {
    http: HttpClient;
    logger: Logger;
    owner: string;
    repo: string;
    workflow: WorkflowLike;
    ref: string;
    inputs: Record<string, unknown>;
    verbose: boolean;
}): Promise<{
    endpoint: string;
    status: number;
}>;
