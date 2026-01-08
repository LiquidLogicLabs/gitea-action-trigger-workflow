# gitea-action-trigger-workflow

[![GitHub release](https://img.shields.io/github/v/release/LiquidLogicLabs/gitea-action-trigger-workflow?sort=semver)](https://github.com/LiquidLogicLabs/gitea-action-trigger-workflow/releases)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-gitea--action--trigger--workflow-blue?logo=github)](https://github.com/marketplace/actions/gitea-action-trigger-workflow)

A GitHub Action that triggers a workflow in another repository hosted on **Gitea** (same instance or a different instance).

## Features

- ✅ Trigger workflows in the same repository or remote repositories
- ✅ Support for same Gitea instance or cross-instance workflows
- ✅ Automatic workflow discovery by name
- ✅ Flexible authentication (explicit token or environment fallback)
- ✅ Support for workflow inputs
- ✅ Verbose logging for debugging
- ✅ Works with Gitea 1.23+ (with endpoint discovery)

## Quick Start

```yaml
- name: Trigger remote workflow
  uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
  with:
    workflow_name: Deploy
```

## Requirements

- Gitea instance with Actions enabled
- Gitea 1.23+ recommended (older versions may have limited API support)
- API token with permissions to:
  - List workflows in the target repository
  - Dispatch workflows in the target repository

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `workflow_name` | ✅ Yes | - | The top-level `name:` field in the workflow YAML file (or filename if no name field exists) |
| `repo` | ❌ No | Current repo | Target repository. Supports `owner/repo` or full URL `https://gitea.example.com/owner/repo` |
| `ref` | ❌ No | `main` | Git ref to run the workflow on (branch/tag/SHA) |
| `base_url` | ❌ No | Auto-detected | Base URL for the target Gitea instance |
| `token` | ❌ No | Runner token | API token for the target Gitea instance |
| `inputs` | ❌ No | - | JSON object string of workflow inputs, e.g. `{"env":"prod","dry_run":true}` |
| `verbose` | ❌ No | `false` | Enable verbose logging for debugging |

### Understanding `workflow_name`

The `workflow_name` refers to the **top-level `name:` field** in your workflow YAML file:

```yaml
# .gitea/workflows/deploy.yml
name: Deploy to Production    # ← This is what you use for workflow_name

on:
  workflow_dispatch:
    inputs:
      environment:
        required: true

jobs:
  deploy:                    # ← NOT this (job name)
    steps:
      - name: Build          # ← NOT this (step name)
        run: echo "building"
```

To trigger this workflow, use: `workflow_name: Deploy to Production`

**If the workflow has no `name:` field**, the filename is used as fallback:
```yaml
# .gitea/workflows/build.yml  (no name: field)
on:
  workflow_dispatch:
jobs:
  build:
    steps:
      - run: echo "building"
```

To trigger this workflow, use: `workflow_name: build` (filename without extension)

## Usage Examples

### Basic: Trigger a workflow in the same repo

```yaml
name: Trigger Deployment

on:
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deploy workflow
        uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
        with:
          workflow_name: Deploy
```

### Trigger a workflow in a different repo (same instance)

```yaml
name: Trigger Build in Another Repo

on:
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger build workflow
        uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
        with:
          repo: other-owner/other-repo
          workflow_name: Build
          ref: main
          inputs: '{"target":"staging","version":"1.0.0"}'
```

### Trigger a workflow on a different Gitea instance

```yaml
name: Trigger Cross-Instance Workflow

on:
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger remote workflow
        uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
        with:
          repo: https://gitea.other.example.com/other-owner/other-repo
          workflow_name: Build
          token: ${{ secrets.OTHER_GITEA_TOKEN }}
          verbose: "true"
```

### With workflow inputs

```yaml
- name: Trigger workflow with inputs
  uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1
  with:
    workflow_name: Deploy
    inputs: |
      {
        "environment": "production",
        "dry_run": false,
        "version": "1.2.3"
      }
```

## Authentication & Permissions

The action requires an API token with sufficient permissions:

- **List workflows**: Read access to the target repository's Actions workflows
- **Dispatch workflows**: Write access to trigger workflow runs

### Token Options

1. **Explicit token** (recommended for cross-instance):
   ```yaml
   token: ${{ secrets.OTHER_GITEA_TOKEN }}
   ```

2. **Environment fallback** (for same instance):
   - Uses `GITEA_TOKEN` or `GITHUB_TOKEN` from the runner environment
   - Automatically available in Gitea Actions runners

The action sends the token as `Authorization: token <token>` in API requests.

## Troubleshooting

### 401 Unauthorized / 403 Forbidden

**Problem**: Token is missing, invalid, or lacks permissions.

**Solutions**:
- Verify the token has the required scopes (read workflows, dispatch workflows)
- Check that the token is valid and not expired
- For cross-instance, ensure you're using the correct token for that instance
- Enable `verbose: "true"` to see authentication details

### 404 Not Found (listing workflows)

**Problem**: Gitea instance may not expose the Actions workflow listing API.

**Solutions**:
- Verify your Gitea version supports Actions (1.19+)
- Check that Actions are enabled on the instance
- Enable `verbose: "true"` to see which endpoints were tried
- Some older Gitea versions may have limited API support

### Workflow dispatch fails

**Problem**: The target Gitea instance may not support remote workflow dispatch via API.

**Solutions**:
- Ensure the workflow has `workflow_dispatch:` trigger enabled
- Verify the workflow name matches exactly (case-sensitive)
- Enable `verbose: "true"` to see attempted endpoints and responses
- Check Gitea version compatibility (1.23+ recommended)

### Workflow not found

**Problem**: The specified `workflow_name` doesn't match any workflow.

**Solutions**:
- Verify the workflow has a `name:` field or use the filename
- Check that the workflow file is in `.gitea/workflows/` or `.github/workflows/`
- Enable `verbose: "true"` to see all available workflows
- Ensure the workflow is on the specified `ref` branch

## Outputs

This action does not produce outputs. It triggers a workflow and reports success/failure via the step status.

## Versioning

This action uses semantic versioning. It's recommended to pin to a major version:

```yaml
uses: LiquidLogicLabs/gitea-action-trigger-workflow@v1  # Recommended
```

Or pin to a specific version:

```yaml
uses: LiquidLogicLabs/gitea-action-trigger-workflow@v0.1.2  # Specific version
```

## Documentation

For developers and contributors:

- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, development workflow, and contributing guidelines
- **[Testing Guide](docs/TESTING.md)** - Complete testing documentation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/LiquidLogicLabs/gitea-action-trigger-workflow#readme)
- 🐛 [Report Issues](https://github.com/LiquidLogicLabs/gitea-action-trigger-workflow/issues)
- 💬 [Discussions](https://github.com/LiquidLogicLabs/gitea-action-trigger-workflow/discussions)
