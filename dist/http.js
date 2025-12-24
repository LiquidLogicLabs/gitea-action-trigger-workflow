"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpClient = createHttpClient;
function safeTruncate(s, max) {
    if (s.length <= max)
        return s;
    return `${s.slice(0, max)}…(truncated)`;
}
function createHttpClient(opts) {
    const { baseUrl, token, logger, verbose } = opts;
    async function request(method, path, body) {
        const url = new URL(path, baseUrl).toString();
        const headers = {
            Accept: 'application/json',
            Authorization: `token ${token}`,
            'User-Agent': 'gitea-action-trigger-workflow',
        };
        let payload;
        if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }
        if (verbose)
            logger.debug(`${method} ${url}`);
        const res = await fetch(url, { method, headers, body: payload });
        const status = res.status;
        const contentType = res.headers.get('content-type') || '';
        const text = await res.text();
        if (verbose) {
            logger.debug(`-> ${status} ${contentType || '(no content-type)'}`);
            if (text)
                logger.debug(`-> body: ${safeTruncate(text, 2000)}`);
        }
        if (text && contentType.includes('application/json')) {
            try {
                return { status, data: JSON.parse(text) };
            }
            catch {
                return { status, text };
            }
        }
        return { status, text };
    }
    return {
        getJson: (path) => request('GET', path),
        postJson: (path, body) => request('POST', path, body),
    };
}
//# sourceMappingURL=http.js.map