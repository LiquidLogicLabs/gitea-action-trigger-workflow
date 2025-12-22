import * as core from '@actions/core';

export type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  debug: (msg: string) => void;
};

export function createLogger(verbose: boolean): Logger {
  return {
    info: (msg) => core.info(msg),
    warn: (msg) => core.warning(msg),
    error: (msg) => core.error(msg),
    debug: (msg) => {
      if (verbose) core.info(`[debug] ${msg}`);
    },
  };
}


