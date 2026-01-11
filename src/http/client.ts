import { Logger } from '../logger';

export type HttpClient = {
  getJson: <T>(path: string) => Promise<{ status: number; data?: T; text?: string }>;
  postJson: <T>(path: string, body: unknown) => Promise<{ status: number; data?: T; text?: string }>;
};

function safeTruncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…(truncated)`;
}

export function createHttpClient(opts: {
  baseUrl: string;
  token: string;
  logger: Logger;
  verbose: boolean;
  userAgent?: string;
}): HttpClient {
  const { baseUrl, token, logger, verbose, userAgent = 'git-action-trigger-workflow' } = opts;

  async function request<T>(method: string, path: string, body?: unknown) {
    const url = new URL(path, baseUrl).toString();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `token ${token}`,
      'User-Agent': userAgent,
    };
    let payload: string | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    if (verbose) logger.debug(`${method} ${url}`);
    const res = await fetch(url, { method, headers, body: payload });
    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (verbose) {
      logger.debug(`-> ${status} ${contentType || '(no content-type)'}`);
      if (text) logger.debug(`-> body: ${safeTruncate(text, 2000)}`);
    }

    if (text && contentType.includes('application/json')) {
      try {
        return { status, data: JSON.parse(text) as T };
      } catch {
        return { status, text };
      }
    }
    return { status, text };
  }

  return {
    getJson: <T>(path: string) => request<T>('GET', path),
    postJson: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  };
}

