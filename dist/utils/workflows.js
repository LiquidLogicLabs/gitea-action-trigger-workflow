"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractWorkflows = extractWorkflows;
exports.findWorkflowByName = findWorkflowByName;
function isWorkflowLike(x) {
    if (!x || typeof x !== 'object')
        return false;
    const obj = x;
    const hasName = typeof obj.name === 'string' && obj.name.trim() !== '';
    const hasPath = typeof obj.path === 'string' && obj.path.trim() !== '';
    const hasFile = typeof obj.file === 'string' && obj.file.trim() !== '';
    return hasName || hasPath || hasFile;
}
function normalizeWorkflow(w) {
    if ((!w.name || w.name.trim() === '') && (w.path || w.file)) {
        const fallback = w.path || w.file || '';
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
function findWorkflowByName(workflows, workflowName) {
    const needle = normalizeName(workflowName);
    let matches = workflows.filter((w) => normalizeName(w.name) === needle);
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
        `Matches:\n${matches
            .map((w) => {
            const name = w.name || (w.path || w.file || 'unnamed');
            return `- ${name}${w.id != null ? ` (id=${w.id})` : ''}${w.path ? ` [${w.path}]` : ''}`;
        })
            .join('\n')}`);
}
//# sourceMappingURL=workflows.js.map