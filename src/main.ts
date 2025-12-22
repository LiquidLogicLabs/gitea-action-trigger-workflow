import * as core from '@actions/core';
import { readConfig } from './config';
import { createHttpClient } from './http';
import { dispatchWorkflow, findWorkflowByName, listWorkflows } from './gitea';
import { createLogger } from './log';

async function run(): Promise<void> {
  const cfg = readConfig();
  const log = createLogger(cfg.verbose);

  // Mask token in logs
  core.setSecret(cfg.token);

  log.info(
    `Triggering workflow '${cfg.workflowName}' in ${cfg.baseUrl}/${cfg.owner}/${cfg.repo} on ref '${cfg.ref}'`,
  );

  log.debug(`inputs keys: ${Object.keys(cfg.inputs).join(', ') || '(none)'}`);

  const http = createHttpClient({ baseUrl: cfg.baseUrl, token: cfg.token, logger: log, verbose: cfg.verbose });

  const { workflows } = await listWorkflows({
    http,
    logger: log,
    owner: cfg.owner,
    repo: cfg.repo,
    verbose: cfg.verbose,
  });

  const wf = findWorkflowByName(workflows, cfg.workflowName);
  const result = await dispatchWorkflow({
    http,
    logger: log,
    owner: cfg.owner,
    repo: cfg.repo,
    workflow: wf,
    ref: cfg.ref,
    inputs: cfg.inputs,
    verbose: cfg.verbose,
  });

  log.info(`Dispatch request accepted (${result.status}).`);
}

run().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  core.setFailed(msg);
});


