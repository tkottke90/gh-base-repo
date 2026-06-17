# Repository Guide

`gh-base-repo` is a central template repository. It stores reusable templates that can be pushed into other repositories via a GitHub Actions workflow, rather than requiring each repository to be set up from scratch.

## Repository structure

```
.github/
  templates/          # Named template bundles (see below)
    docker-deploy/    # Docker build & deploy workflow
    nodejs/           # Node.js workspace monorepo scaffold
    npm-publish/      # NPM package publish workflow
    typescript/       # TypeScript/Node.js project with Mocha/Chai
  workflows/
    distribute.yml    # Workflow that pushes templates to target repos
```

## Versioning standard

All deploy templates follow a common versioning pattern driven by two triggers.

### Git tag convention

Releases are tagged in git using the format `v<Major>.<Minor>.<Patch>` (e.g. `v1.2.3`). This tag is created when a GitHub Release is published and is the single source of truth for the release version.

### Trigger behaviour

| Trigger | Version computed | Artifact pushed? |
|---------|-----------------|-----------------|
| `release` (published) | Taken directly from the git tag that created the release | Always |
| `workflow_dispatch` | `<base>-RC-<short-sha>` where `<base>` is the latest semver tag (falls back to `v0.0.0`) | Only if the `deploy` input is `true` |

The `workflow_dispatch` path is a dry-run by default (`deploy: false`), so triggering it manually builds and validates without publishing anything.

### Version format by artifact type

The `v` prefix is preserved or stripped depending on what the target ecosystem expects:

| Artifact | Release version | RC version |
|----------|----------------|------------|
| Docker image tag | `v1.2.3` | `v1.2.3-RC-abc1234` |
| NPM package version | `1.2.3` | `1.2.3-RC-abc1234` |

### Adding versioning to a new deploy template

1. Add a `Compute version` step (or equivalent) that outputs `value` (the computed version string) and `push` (`true`/`false`)
2. On `release`: read `github.ref_name` for the version; set `push=true`
3. On `workflow_dispatch`: find the latest tag with `git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1`, append `-RC-$(git rev-parse --short HEAD)`; set `push=${{ inputs.deploy }}`
4. Gate any publish/push step on `steps.<id>.outputs.push == 'true'`

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

**Triggers:** follows the [versioning standard](#versioning-standard) — Docker image tags keep the `v` prefix (`v1.2.3`, `v1.2.3-RC-abc1234`).

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

### npm-publish

Adds an NPM package publish workflow to a target repository.

**File:** `.github/workflows/npm-publish.yml`

**Triggers:** follows the [versioning standard](#versioning-standard) — npm package versions strip the `v` prefix (`1.2.3`, `1.2.3-RC-abc1234`). On `release`, the tarball is attached to the GitHub release as an asset.

**Dist-tag logic** (carried through to `npm publish --tag`):

| Version format | Dist-tag |
|----------------|----------|
| `1.2.3` | `latest` |
| `1.2.3-alpha.1` | `alpha` |
| `1.2.3-RC-abc1234` | `RC` |
| `1.2.3-1` (numeric pre-release) | `next` |

**Configuration (set in the target repo):**

| Name | Type | Description |
|------|------|-------------|
| `NPM_REGISTRY_URL` | Repository variable | Registry URL. Defaults to `https://registry.npmjs.org` if not set |
| `NPM_REGISTRY_TOKEN` | Secret | Auth token for the registry. Required when `deploy` is true |

**Job summary** — each run writes a summary to the Actions tab showing the package name, version, publish status, dist-tag, and tarball filename.

### typescript

A TypeScript/Node.js project scaffold with Mocha and Chai for testing and ts-node for direct execution.

**Files:**

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript compiler config (CommonJS, ES2022, strict) |
| `.mocharc.yml` | Mocha config — registers ts-node and points at `test/**/*.test.ts` |
| `src/index.ts` | Entry point placeholder |
| `test/index.test.ts` | Example test demonstrating Mocha/Chai usage |

**Scripts:**

| Script | Command |
|--------|---------|
| `npm run build` | `tsc` — compiles to `dist/` |
| `npm test` | `mocha` — runs all `test/**/*.test.ts` files via ts-node |
| `npm start` | `ts-node src/index.ts` — runs the entry point directly |

After distributing, update `name` in `package.json` and run `npm install`.

## Distributing a template

Templates are pushed to target repositories using the **Distribute Template** workflow (`distribute.yml`), triggered manually from the Actions tab.

**Inputs:**

| Input | Description |
|-------|-------------|
| `target_repo` | The repository to push to, in `owner/repo` format |
| `template` | The template to distribute (`docker-deploy`, `nodejs`, `npm-publish`, or `typescript`) |

The workflow checks out both this repo and the target repo, copies all files from the chosen template bundle into the target root, and opens a pull request in the target repository for review before anything is merged.

**Required secret:** `DISTRIBUTION_TOKEN` — a Personal Access Token (or GitHub App token) with `repo` write access to any target repository you intend to distribute to. Set this in the settings of this repository.

> The distribute workflow always opens a PR rather than pushing directly, so the target repository owner can review what changed.

## Adding a new template

1. Create a new subdirectory under `.github/templates/<template-name>/`
2. Add files using the same path structure they should have in the target repo
3. Add `<template-name>` to the `options` list of the `template` input in `.github/workflows/distribute.yml`
