"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGiteaClient = createGiteaClient;
exports.findWorkflowForGitea = findWorkflowForGitea;
const workflows_1 = require("../utils/workflows");
function buildCandidates(owner, repo) {
    return [
        `/api/v1/repos/${owner}/${repo}/actions/workflows`,
        `/api/v1/repos/${owner}/${repo}/actions/workflows?per_page=100`,
        `/api/v1/repos/${owner}/${repo}/actions/workflows?limit=100`,
    ];
}
async function listWorkflowsInternal(opts) {
    const { http, logger, owner, repo, verbose } = opts;
    const candidates = buildCandidates(owner, repo);
    const attempts = [];
    for (const endpoint of candidates) {
        const res = await http.getJson(endpoint);
        attempts.push({ endpoint, status: res.status });
        if (res.status >= 200 && res.status < 300 && res.data !== undefined) {
            const ws = (0, workflows_1.extractWorkflows)(res.data);
            if (ws !== null) {
                if (verbose)
                    logger.debug(`Using workflows list endpoint: ${endpoint} (count=${ws.length})`);
                return { endpoint, workflows: ws };
            }
            attempts[attempts.length - 1].hint = 'Unexpected JSON schema';
        }
    }
    const summary = attempts
        .map((a) => `- ${a.status} ${a.endpoint}${a.hint ? ` (${a.hint})` : ''}`)
        .join('\n');
    throw new Error(`Unable to list workflows via API. This Gitea instance may not expose an Actions workflows API.\n` +
        `Tried:\n${summary}\n\n` +
        `If you believe your server supports it, enable verbose logging and verify your base_url/token permissions.`);
}
function buildDispatchCandidates(owner, repo, workflow) {
    const dispatchCandidates = [];
    if (workflow.id != null) {
        dispatchCandidates.push(`/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatches`, `/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatch`);
    }
    const file = workflow.path || workflow.file;
    if (file) {
        const enc = encodeURIComponent(file);
        dispatchCandidates.push(`/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatches`, `/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatch`);
    }
    const nameEnc = encodeURIComponent(workflow.name);
    dispatchCandidates.push(`/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatches`, `/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatch`);
    return dispatchCandidates;
}
async function dispatchWorkflowInternal(opts) {
    const { http, logger, owner, repo, workflow, ref, inputs, verbose } = opts;
    const body = { ref, inputs };
    const dispatchCandidates = buildDispatchCandidates(owner, repo, workflow);
    const attempts = [];
    for (const endpoint of dispatchCandidates) {
        const res = await http.postJson(endpoint, body);
        attempts.push({ endpoint, status: res.status });
        if (res.status >= 200 && res.status < 300) {
            if (verbose)
                logger.debug(`Dispatched via: ${endpoint} (${res.status})`);
            return { endpoint, status: res.status };
        }
    }
    const summary = attempts.map((a) => `- ${a.status} ${a.endpoint}`).join('\n');
    throw new Error(`Unable to dispatch workflow '${workflow.name}'. This server may not support remote dispatch via API.\n` +
        `Tried:\n${summary}\n\n` +
        `If you control the target repo, a reliable fallback is to add a workflow trigger based on a repo event you can create via API (e.g. push tag/commit), or expose a lightweight webhook endpoint that triggers the workflow.`);
}
function createGiteaClient(ctx) {
    const { http, logger, owner, repo, verbose } = ctx;
    return {
        listWorkflows: () => listWorkflowsInternal({
            http,
            logger,
            owner,
            repo,
            verbose,
        }),
        dispatchWorkflow: (workflow, ref, inputs) => dispatchWorkflowInternal({
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
function findWorkflowForGitea(workflows, workflowName) {
    return (0, workflows_1.findWorkflowByName)(workflows, workflowName);
}
//# sourceMappingURL=gitea.js.map