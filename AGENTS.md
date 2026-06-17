# Repository Guide

`gh-base-repo` is a central template repository. It stores reusable templates that can be pushed into other repositories via a GitHub Actions workflow, rather than requiring each repository to be set up from scratch.

## Repository structure

```
.github/
  templates/          # Named template bundles (see below)
    docker-deploy/    # Docker build & deploy workflow
    nodejs/           # Node.js project scaffold
  workflows/
    distribute.yml    # Workflow that pushes templates to target repos
```

## Templates

Each subdirectory of `.github/templates/` is a self-contained template bundle. The files inside mirror the path structure they should have in the target repository root. For example:

```
.github/templates/docker-deploy/.github/workflows/docker-deploy.yml
                  ^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                  template name  path in the target repo
```

### docker-deploy

Adds a Docker build and push workflow to a target repository.

**File:** `.github/workflows/docker-deploy.yml`

**Triggers:**
- `release` (published) — builds and pushes the image tagged with the release version (e.g. `v1.2.3`)
- `workflow_dispatch` — builds a release candidate tagged as `v<Major>.<Minor>.<Patch>-RC-<short-sha>`, with an optional `deploy` input to push it to the registry

**Configuration (set in the target repo):**

| Name | Type | Description |
|------|------|-------------|
| `DOCKER_REGISTRY` | Repository variable | Container registry host. Defaults to `ghcr.io` if not set |
| `REGISTRY_USERNAME` | Secret | Registry login username. Defaults to `github.actor` (works for GHCR) |
| `REGISTRY_PASSWORD` | Secret | Registry login password. Defaults to `GITHUB_TOKEN` (works for GHCR) |

### nodejs

Adds a root `package.json` configured for an npm workspace monorepo.

**File:** `package.json`

Includes `build`, `test`, `lint`, and `format` scripts that each delegate to every workspace via `npm run <script> --workspaces --if-present`. Add workspace package paths to the `workspaces` array as packages are added to the repository.

## Distributing a template

Templates are pushed to target repositories using the **Distribute Template** workflow (`distribute.yml`), triggered manually from the Actions tab.

**Inputs:**

| Input | Description |
|-------|-------------|
| `target_repo` | The repository to push to, in `owner/repo` format |
| `template` | The template to distribute (`docker-deploy` or `nodejs`) |

The workflow checks out both this repo and the target repo, copies all files from the chosen template bundle into the target root, and opens a pull request in the target repository for review before anything is merged.

**Required secret:** `DISTRIBUTION_TOKEN` — a Personal Access Token (or GitHub App token) with `repo` write access to any target repository you intend to distribute to. Set this in the settings of this repository.

> The distribute workflow always opens a PR rather than pushing directly, so the target repository owner can review what changed.

## Adding a new template

1. Create a new subdirectory under `.github/templates/<template-name>/`
2. Add files using the same path structure they should have in the target repo
3. Add `<template-name>` to the `options` list of the `template` input in `.github/workflows/distribute.yml`
