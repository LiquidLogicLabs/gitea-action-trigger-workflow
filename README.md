# gitea-action-trigger-workflow

Triggers a workflow in another repository hosted on **Gitea** (same instance or a different instance).

## Inputs

- `workflow_name` (required): Workflow name (the `name:` value in the workflow YAML).
- `repo` (optional): Target repo, supports:
  - `owner/repo`
  - `https://gitea.example.com/owner/repo`
  Defaults to the current repo from the runner environment.
- `ref` (optional): Git ref to run on (branch/tag/SHA). Default: `main`.
- `base_url` (optional): Base URL for the target Gitea instance (e.g. `https://gitea.example.com`).
  If omitted, it is derived from `repo` when `repo` is a URL; otherwise from the runner environment.
- `token` (optional): API token for the target Gitea instance. If omitted, falls back to runner token env.
- `inputs` (optional): JSON object string of workflow inputs, e.g. `{"env":"prod","dry_run":true}`.
- `verbose` (optional): `true` to print endpoint discovery and HTTP diagnostics. Default: `false`.

## Usage examples

### Trigger a workflow in the same repo

```yaml
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
        with:
          workflow_name: Deploy
```

### Trigger a workflow in a different repo on the same Gitea instance

```yaml
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
        with:
          repo: other-owner/other-repo
          workflow_name: Build
          inputs: '{"target":"staging"}'
```

### Trigger a workflow on a different Gitea instance

```yaml
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
        with:
          repo: https://gitea.other.example.com/other-owner/other-repo
          workflow_name: Build
          token: ${{ secrets.OTHER_GITEA_TOKEN }}
          verbose: "true"
```

## Permissions / token notes

The `token` must be able to call the remote instance API and have permissions to:
- list workflows in the target repo
- dispatch the selected workflow

This action sends the token as `Authorization: token <token>`.

## Troubleshooting

- **401/403**: token missing/invalid or lacks permission for the target repo.
- **404 listing workflows**: your Gitea may not expose an Actions workflow listing API; run with `verbose: "true"` to see which endpoints were tried.
- **Dispatch fails**: some Gitea versions don’t support remote dispatch via API; verbose output will show attempted endpoints and responses.


