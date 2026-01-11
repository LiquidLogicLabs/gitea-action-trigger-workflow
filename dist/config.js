"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.__internal = void 0;
exports.parseRepoTarget = parseRepoTarget;
exports.readConfig = readConfig;
const core = __importStar(require("@actions/core"));
function parseBool(v, defaultValue) {
    if (v == null || v === '')
        return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}
function getEnvAny(names) {
    for (const n of names) {
        const v = process.env[n];
        if (v && v.trim() !== '')
            return v;
    }
    return undefined;
}
function parseRepoTarget(repoInput) {
    if (repoInput.includes('://')) {
        const u = new URL(repoInput);
        const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
        if (parts.length < 2) {
            throw new Error(`Invalid repo URL path in 'repo': ${repoInput}`);
        }
        return { baseUrl: u.origin, owner: parts[0], repo: parts[1] };
    }
    const m = repoInput.match(/^([^/]+)\/([^/]+)$/);
    if (!m)
        throw new Error(`Invalid 'repo' format: ${repoInput} (expected owner/repo or URL)`);
    return { owner: m[1], repo: m[2] };
}
function normalizeOrigin(baseUrl) {
    const u = new URL(baseUrl);
    return u.origin;
}
function detectPlatform(baseUrl, repoUrlHost) {
    const host = (baseUrl && new URL(baseUrl).host) || repoUrlHost || '';
    const hasGithubEnv = !!getEnvAny(['GITHUB_SERVER_URL', 'GITHUB_REPOSITORY', 'GITHUB_API_URL', 'GITHUB_ACTIONS']);
    if (host.includes('github.') || host === 'github.com' || hasGithubEnv) {
        return 'github';
    }
    return 'gitea';
}
function computeApiBase(platform, baseUrl) {
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
function parseInputs(inputsRaw) {
    if (!inputsRaw)
        return {};
    try {
        const v = JSON.parse(inputsRaw);
        if (v && typeof v === 'object' && !Array.isArray(v))
            return { ...v };
        throw new Error('inputs must be a JSON object');
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Invalid 'inputs' JSON: ${msg}`);
    }
}
function readConfig() {
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
    const baseUrl = baseUrlInput ||
        target.baseUrl ||
        envBaseUrl ||
        (() => {
            throw new Error(`Missing base URL. Provide input 'base_url', use a URL in 'repo', or ensure env GITEA_SERVER_URL/GITHUB_SERVER_URL is set.`);
        })();
    const platform = detectPlatform(baseUrl, target.baseUrl ? new URL(baseUrl).host : undefined);
    const apiBaseUrl = computeApiBase(platform, baseUrl);
    const token = tokenInput ||
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
exports.__internal = {
    detectPlatform,
    computeApiBase,
    normalizeOrigin,
};
//# sourceMappingURL=config.js.map