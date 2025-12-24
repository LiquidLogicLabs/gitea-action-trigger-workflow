import { Logger } from './log';
export type HttpClient = {
    getJson: <T>(path: string) => Promise<{
        status: number;
        data?: T;
        text?: string;
    }>;
    postJson: <T>(path: string, body: unknown) => Promise<{
        status: number;
        data?: T;
        text?: string;
    }>;
};
export declare function createHttpClient(opts: {
    baseUrl: string;
    token: string;
    logger: Logger;
    verbose: boolean;
}): HttpClient;
