# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-12-22

### Added
- Initial release of gitea-action-trigger-workflow
- Node-based action to trigger workflows in remote Gitea repositories
- Support for workflow discovery by name
- Configurable inputs: repo, workflow_name, ref, base_url, token, inputs, verbose
- Automatic base URL and token resolution from runner environment
- Comprehensive documentation and examples
- Unit tests with Jest
- CI workflows for Gitea and GitHub
- Release workflows with changelog generation from Conventional Commits
