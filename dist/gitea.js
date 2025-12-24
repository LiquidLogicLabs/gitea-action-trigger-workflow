"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkflows = listWorkflows;
exports.findWorkflowByName = findWorkflowByName;
exports.dispatchWorkflow = dispatchWorkflow;
function isWorkflowLike(x) {
    if (!x || typeof x !== 'object')
        return false;
    const obj = x;
    // Workflow must have either a name or a path/file to identify it
    const hasName = typeof obj.name === 'string' && obj.name.trim() !== '';
    const hasPath = typeof obj.path === 'string' && obj.path.trim() !== '';
    const hasFile = typeof obj.file === 'string' && obj.file.trim() !== '';
    return hasName || hasPath || hasFile;
}
function normalizeWorkflow(w) {
    // If workflow has no name but has a path/file, use that as the name
    if ((!w.name || w.name.trim() === '') && (w.path || w.file)) {
        const fallback = w.path || w.file || '';
        // Extract just the filename without path/extension for cleaner display
        const filename = fallback.split('/').pop()?.replace(/\.ya?ml$/, '') || fallback;
        return { ...w, name: filename };
    }
    return w;
}
function extractWorkflows(payload) {
    const extract = (items) => {
        const ws = items.filter(isWorkflowLike).map(normalizeWorkflow);
        return ws.length > 0 ? ws : [];
    };
    if (Array.isArray(payload)) {
        return extract(payload);
    }
    if (payload && typeof payload === 'object') {
        const obj = payload;
        if (Array.isArray(obj.workflows)) {
            return extract(obj.workflows);
        }
        if (Array.isArray(obj.data)) {
            return extract(obj.data);
        }
    }
    return null;
}
function normalizeName(s) {
    return s.trim();
}
async function listWorkflows(opts) {
    const { http, logger, owner, repo, verbose } = opts;
    const candidates = [
        `/api/v1/repos/${owner}/${repo}/actions/workflows`,
        `/api/v1/repos/${owner}/${repo}/actions/workflows?per_page=100`,
        `/api/v1/repos/${owner}/${repo}/actions/workflows?limit=100`,
    ];
    const attempts = [];
    for (const endpoint of candidates) {
        const res = await http.getJson(endpoint);
        attempts.push({ endpoint, status: res.status });
        if (res.status >= 200 && res.status < 300 && res.data !== undefined) {
            const ws = extractWorkflows(res.data);
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
function findWorkflowByName(workflows, workflowName) {
    const needle = normalizeName(workflowName);
    // Try exact name match first
    let matches = workflows.filter((w) => normalizeName(w.name) === needle);
    // If no match and workflow has no explicit name, try matching against filename
    if (matches.length === 0) {
        matches = workflows.filter((w) => {
            const path = w.path || w.file || '';
            const filename = path.split('/').pop()?.replace(/\.ya?ml$/, '') || '';
            return normalizeName(filename) === needle || normalizeName(path) === needle;
        });
    }
    if (matches.length === 1)
        return matches[0];
    const available = workflows
        .map((w) => {
        const name = w.name || (w.path || w.file || 'unnamed');
        return `- ${name}${w.id != null ? ` (id=${w.id})` : ''}${w.path ? ` [${w.path}]` : ''}`;
    })
        .slice(0, 50)
        .join('\n');
    if (matches.length === 0) {
        throw new Error(`Workflow '${workflowName}' not found. Available workflows:\n${available || '(none found)'}`);
    }
    throw new Error(`Workflow '${workflowName}' is ambiguous (${matches.length} matches). Please disambiguate by renaming workflows.\n` +
        `Matches:\n${matches.map((w) => {
            const name = w.name || (w.path || w.file || 'unnamed');
            return `- ${name}${w.id != null ? ` (id=${w.id})` : ''}${w.path ? ` [${w.path}]` : ''}`;
        }).join('\n')}`);
}
async function dispatchWorkflow(opts) {
    const { http, logger, owner, repo, workflow, ref, inputs, verbose } = opts;
    const body = { ref, inputs };
    const dispatchCandidates = [];
    if (workflow.id != null) {
        dispatchCandidates.push(`/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatches`, `/api/v1/repos/${owner}/${repo}/actions/workflows/${workflow.id}/dispatch`);
    }
    // If server returns a path/filename, try file-based dispatch routes too.
    const file = workflow.path || workflow.file;
    if (file) {
        const enc = encodeURIComponent(file);
        dispatchCandidates.push(`/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatches`, `/api/v1/repos/${owner}/${repo}/actions/workflows/${enc}/dispatch`);
    }
    // As a last resort, try a name-based route (some servers might support it).
    const nameEnc = encodeURIComponent(workflow.name);
    dispatchCandidates.push(`/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatches`, `/api/v1/repos/${owner}/${repo}/actions/workflows/${nameEnc}/dispatch`);
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
//# sourceMappingURL=gitea.js.map